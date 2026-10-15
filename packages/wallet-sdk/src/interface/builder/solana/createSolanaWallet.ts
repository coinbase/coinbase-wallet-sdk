import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import {
  SOLANA_MAINNET,
  SOLANA_WALLET_STANDARD_MAINNET,
  type SolanaInvokeRequest,
  type SolanaInvokeResultFor,
  handleSolanaRequest,
  projectSolanaAccounts,
} from ':core/namespaces/solana/index.js';
import { activeGrantForChain, activeSession } from ':core/session/grants.js';
import type { Session } from ':core/session/types.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { COINBASE_WALLET_ICON } from ':ui/assets/coinbaseWalletIcon.js';
import {
  SignAndSendAllTransactions,
  SolanaSignAndSendTransaction,
  SolanaSignMessage,
  SolanaSignTransaction,
} from '@solana/wallet-standard-features';
import type { IdentifierString, Wallet, WalletAccount } from '@wallet-standard/base';
import {
  StandardConnect,
  StandardDisconnect,
  StandardEvents,
  type StandardEventsOnMethod,
} from '@wallet-standard/features';
import { ReadonlyWalletAccount } from '@wallet-standard/wallet';
import * as Base58 from 'ox/Base58';
import {
  ACCOUNT_FEATURES,
  CoinbaseSignPreparedCalls,
  type OptionalSolanaFeatures,
  type RequiredSolanaFeatures,
  type SolanaWallet,
} from './features.js';

function requireAccount(wallet: Wallet, account: WalletAccount): WalletAccount {
  const current = wallet.accounts.find((candidate) => candidate.address === account.address);
  if (!current) {
    throw standardErrors.provider.unauthorized('Solana account is not authorized');
  }
  return current;
}

function assertMainnet(chain: string): void {
  if (chain !== SOLANA_WALLET_STANDARD_MAINNET) {
    throw standardErrors.provider.unsupportedChain(`Unsupported Solana chain ${chain}`);
  }
}

function accountFromAddress(address: string, features: readonly IdentifierString[]): WalletAccount {
  let publicKey: Uint8Array;
  try {
    publicKey = Base58.toBytes(address);
  } catch {
    throw standardErrors.rpc.internal('Solana account must be valid base58');
  }
  if (publicKey.length !== 32) {
    throw standardErrors.rpc.internal('Solana account must decode to 32 bytes');
  }
  return new ReadonlyWalletAccount({
    address,
    publicKey,
    chains: [SOLANA_WALLET_STANDARD_MAINNET],
    features,
  });
}

function sameItems<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/** Create a Wallet Standard wallet over any CAIP-capable wallet transport. */
export function createSolanaWallet(
  transport: WalletTransport,
  session: Store['session']
): SolanaWallet {
  const listeners = new Set<Parameters<StandardEventsOnMethod>[1]>();
  const on: StandardEventsOnMethod = (_event, listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  let accounts: readonly WalletAccount[] = [];

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
      }
      throw error;
    }
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
          if (input.chain) assertMainnet(input.chain);
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
          assertMainnet(input.chain);
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
          assertMainnet(input.chain);
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

  /** Keyed by the session method that must be granted before the feature is listed. */
  const optionalFeatures: Record<string, Partial<OptionalSolanaFeatures>> = {
    coinbase_signPreparedCalls: {
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
    },
  };

  let grantedFeatures: readonly Partial<OptionalSolanaFeatures>[] = [];
  let listedFeatures: SolanaWallet['features'] = features;

  /** Wallet Standard change events carry only the properties that changed. */
  const sync = (nextSession: Session | undefined) => {
    const addresses = nextSession ? projectSolanaAccounts(nextSession) : [];
    const grant = nextSession && activeGrantForChain(nextSession, SOLANA_MAINNET);
    const nextGranted = Object.entries(optionalFeatures)
      .filter(([method]) => grant?.methods.includes(method))
      .map(([, feature]) => feature);

    const featuresChanged = !sameItems(nextGranted, grantedFeatures);
    const accountsChanged = !sameItems(
      accounts.map(({ address }) => address),
      addresses
    );

    if (!featuresChanged && !accountsChanged) return;

    if (featuresChanged) {
      grantedFeatures = nextGranted;
      listedFeatures = nextGranted.reduce<SolanaWallet['features']>(
        (all, feature) => ({ ...all, ...feature }),
        features
      );
    }

    const accountFeatures = ACCOUNT_FEATURES.filter((name) => name in listedFeatures);
    accounts = addresses.map((address) => accountFromAddress(address, accountFeatures));

    const change = featuresChanged ? { accounts, features: listedFeatures } : { accounts };
    listeners.forEach((listener) => listener(change));
  };

  const wallet: SolanaWallet = {
    version: '1.0.0',
    name: 'Coinbase Wallet',
    icon: COINBASE_WALLET_ICON,
    chains: [SOLANA_WALLET_STANDARD_MAINNET],
    get features() {
      return listedFeatures;
    },
    get accounts() {
      return accounts;
    },
  };

  sync(activeSession(transport.readSession()));
  session.subscribe(sync);
  return wallet;
}
