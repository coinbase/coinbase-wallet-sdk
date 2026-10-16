import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import {
  SOLANA_MAINNET,
  SOLANA_WALLET_STANDARD_MAINNET,
  handleSolanaRequest,
  projectSolanaAccounts,
  type SolanaInvokeRequest,
  type SolanaInvokeResultFor,
} from ':core/namespaces/solana/index.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Session } from ':core/session/types.js';
import type { Store } from ':store/store.js';
import { COINBASE_WALLET_ICON } from ':ui/assets/coinbaseWalletIcon.js';
import { activeGrantForChain, activeSession } from ':core/session/grants.js';
import {
  SignAndSendAllTransactions,
  SolanaSignAndSendTransaction,
  SolanaSignMessage,
  SolanaSignTransaction,
} from '@solana/wallet-standard-features';
import type { Wallet, WalletAccount } from '@wallet-standard/base';
import {
  StandardConnect,
  StandardDisconnect,
  StandardEvents,
  type StandardEventsOnMethod,
} from '@wallet-standard/features';
import { ReadonlyWalletAccount } from '@wallet-standard/wallet';
import * as Base58 from 'ox/Base58';
import {
  CoinbaseSignPreparedCalls,
  type CoinbaseSignPreparedCallsFeature,
  FIRST_PARTY_ACCOUNT_FEATURES,
  type RequiredSolanaFeatures,
  SOLANA_ACCOUNT_FEATURES,
  type SolanaWallet,
} from './features.js';

function accountFromAddress(
  address: string,
  features: typeof SOLANA_ACCOUNT_FEATURES | typeof FIRST_PARTY_ACCOUNT_FEATURES
): WalletAccount {
  try {
    const publicKey = Base58.toBytes(address);
    if (publicKey.length !== 32) {
      throw standardErrors.rpc.internal('Solana account must decode to 32 bytes');
    }
    return new ReadonlyWalletAccount({
      address,
      publicKey,
      chains: [SOLANA_WALLET_STANDARD_MAINNET],
      features,
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) throw error;
    throw standardErrors.rpc.internal('Solana account must be valid base58');
  }
}

function requireAccount(wallet: Wallet, account: WalletAccount): WalletAccount {
  const current = wallet.accounts.find((candidate) => candidate.address === account.address);
  if (!current) {
    throw standardErrors.provider.unauthorized('Solana account is not authorized');
  }
  return current;
}

/** Create a Wallet Standard wallet over any CAIP-capable wallet transport. */
export function createSolanaWallet(
  transport: WalletTransport,
  session: Store['session']
): SolanaWallet {
  const listeners = new Set<Parameters<StandardEventsOnMethod>[1]>();
  let accounts: readonly WalletAccount[] = [];
  let signsPreparedCalls = false;

  /** Wallet Standard change events carry only the properties that changed. */
  const sync = (nextSession: Session | undefined) => {
    const addresses = nextSession ? projectSolanaAccounts(nextSession) : [];
    const grant = nextSession && activeGrantForChain(nextSession, SOLANA_MAINNET);
    const preparedCalls = grant?.methods.includes('coinbase_signPreparedCalls') ?? false;
    const featuresChanged = preparedCalls !== signsPreparedCalls;
    if (
      !featuresChanged &&
      accounts.length === addresses.length &&
      accounts.every((account, index) => account.address === addresses[index])
    ) {
      return;
    }
    signsPreparedCalls = preparedCalls;
    const accountFeatures = preparedCalls ? FIRST_PARTY_ACCOUNT_FEATURES : SOLANA_ACCOUNT_FEATURES;
    accounts = addresses.map((address) => accountFromAddress(address, accountFeatures));
    const change = featuresChanged ? { accounts, features: wallet.features } : { accounts };
    listeners.forEach((listener) => listener(change));
  };

  const invoke = async <Request extends SolanaInvokeRequest>(
    request: Request
  ): Promise<SolanaInvokeResultFor<Request>> => {
    try {
      return (await handleSolanaRequest(transport, request)) as SolanaInvokeResultFor<Request>;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === standardErrorCodes.provider.unauthorized
      ) {
        await transport.cleanup();
        throw error;
      }
      throw error;
    }
  };

  const on: StandardEventsOnMethod = (_event, listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const features: RequiredSolanaFeatures = {
    [StandardConnect]: {
      version: '1.0.0',
      async connect(options) {
        // Silent connect reports the restored accounts; it never prompts or pairs.
        if (options?.silent) return { accounts };
        await handleSolanaRequest(transport, { method: 'connect' });
        sync(transport.readSession());
        if (accounts.length === 0) {
          throw standardErrors.rpc.internal('Solana connect did not return an account');
        }
        return { accounts };
      },
    },
    [StandardDisconnect]: {
      version: '1.0.0',
      async disconnect() {
        await handleSolanaRequest(transport, { method: 'disconnect' });
        sync(undefined);
      },
    },
    [StandardEvents]: { version: '1.0.0', on },
    [SolanaSignMessage]: {
      version: '1.1.0',
      async signMessage(...inputs) {
        const outputs = [];
        for (const input of inputs) {
          const account = requireAccount(wallet, input.account);
          const result = await invoke({
            method: 'solana_signMessage',
            params: {
              pubkey: account.address,
              message: input.message,
            },
          });
          if (!('signature' in result)) {
            throw standardErrors.rpc.internal(
              'Solana message response type does not match request'
            );
          }
          outputs.push({
            signature: result.signature,
            signedMessage: result.signedMessage ?? input.message,
          });
        }
        return outputs;
      },
    },
    [SolanaSignTransaction]: {
      version: '1.0.0',
      supportedTransactionVersions: ['legacy', 0],
      async signTransaction(...inputs) {
        const outputs = [];
        for (const input of inputs) {
          if (input.chain && input.chain !== SOLANA_WALLET_STANDARD_MAINNET) {
            throw standardErrors.provider.unsupportedChain(
              `Unsupported Solana chain ${input.chain}`
            );
          }
          const account = requireAccount(wallet, input.account);
          const result = await invoke({
            method: 'solana_signTransaction',
            params: {
              pubkey: account.address,
              transaction: input.transaction,
              ...(input.options ? { options: input.options } : {}),
            },
          });
          if (!('signedTransaction' in result)) {
            throw standardErrors.rpc.internal(
              'Solana transaction response type does not match request'
            );
          }
          outputs.push({ signedTransaction: result.signedTransaction });
        }
        return outputs;
      },
    },
    [SolanaSignAndSendTransaction]: {
      version: '1.0.0',
      supportedTransactionVersions: ['legacy', 0],
      async signAndSendTransaction(...inputs) {
        const outputs = [];
        for (const input of inputs) {
          if (input.chain !== SOLANA_WALLET_STANDARD_MAINNET) {
            throw standardErrors.provider.unsupportedChain(
              `Unsupported Solana chain ${input.chain}`
            );
          }
          const account = requireAccount(wallet, input.account);
          const result = await invoke({
            method: 'solana_signAndSendTransaction',
            params: {
              pubkey: account.address,
              transaction: input.transaction,
              ...(input.options ? { options: input.options } : {}),
            },
          });
          if (Array.isArray(result) || !('signature' in result)) {
            throw standardErrors.rpc.internal(
              'Solana sign-and-send response type does not match request'
            );
          }
          outputs.push({ signature: result.signature });
        }
        return outputs;
      },
    },
    [SignAndSendAllTransactions]: {
      version: '1.0.0',
      supportedTransactionVersions: ['legacy', 0],
      async signAndSendAllTransactions(inputs, options) {
        if (inputs.length === 0) {
          throw standardErrors.rpc.invalidParams('Solana transaction batch must not be empty');
        }
        const batch = inputs.map((input) => {
          if (input.chain !== SOLANA_WALLET_STANDARD_MAINNET) {
            throw standardErrors.provider.unsupportedChain(
              `Unsupported Solana chain ${input.chain}`
            );
          }
          const account = requireAccount(wallet, input.account);
          return {
            pubkey: account.address,
            transaction: input.transaction,
            ...(input.options ? { options: input.options } : {}),
          };
        });
        const result = await invoke({
          method: 'solana_signAndSendAllTransactions',
          params: {
            inputs: batch,
            ...(options ? { options } : {}),
          },
        });
        if (!Array.isArray(result)) {
          throw standardErrors.rpc.internal('Solana batch response type does not match request');
        }
        return result;
      },
    },
  };

  const featuresWithPreparedCalls: RequiredSolanaFeatures & CoinbaseSignPreparedCallsFeature = {
    ...features,
    [CoinbaseSignPreparedCalls]: {
      version: '1.0.0',
      async signPreparedCalls({ account, ...params }) {
        const { address } = requireAccount(wallet, account);
        return invoke({
          method: 'coinbase_signPreparedCalls',
          params: [{ ...params, pubkey: address }],
        });
      },
    },
  };

  const wallet: SolanaWallet = {
    version: '1.0.0',
    name: 'Coinbase Wallet',
    icon: COINBASE_WALLET_ICON,
    chains: [SOLANA_WALLET_STANDARD_MAINNET],
    get features() {
      return signsPreparedCalls ? featuresWithPreparedCalls : features;
    },
    get accounts() {
      return accounts;
    },
  };

  sync(activeSession(transport.readSession()));
  session.subscribe(sync);
  return wallet;
}
