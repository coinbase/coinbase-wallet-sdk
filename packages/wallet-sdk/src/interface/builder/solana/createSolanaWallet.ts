import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import {
  SOLANA_WALLET_STANDARD_MAINNET,
  handleSolanaRequest,
  projectSolanaAccounts,
  type SolanaInvokeRequest,
  type SolanaInvokeResultFor,
} from ':core/namespaces/solana/index.js';
import type { WalletTransport } from ':core/transport/index.js';
import type { Store } from ':store/store.js';
import { activeSession } from ':core/session/activeSession.js';
import {
  SignAndSendAllTransactions,
  type SolanaSignAndSendAllTransactionsFeature,
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from '@solana/wallet-standard-features';
import type { Wallet, WalletAccount, WalletIcon } from '@wallet-standard/base';
import {
  StandardConnect,
  type StandardConnectFeature,
  StandardDisconnect,
  type StandardDisconnectFeature,
  StandardEvents,
  type StandardEventsFeature,
  type StandardEventsOnMethod,
} from '@wallet-standard/features';
import { ReadonlyWalletAccount } from '@wallet-standard/wallet';
import * as Base58 from 'ox/Base58';

const SOLANA_ACCOUNT_FEATURES = [
  SolanaSignMessage,
  SolanaSignTransaction,
  SolanaSignAndSendTransaction,
  SignAndSendAllTransactions,
] as const;
const COINBASE_WALLET_ICON =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHBhdGggZmlsbD0iIzAwNTJGRiIgZD0iTTAgMGgzMnYzMkgweiIvPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik04IDEyaDE2djhIOHoiLz48L3N2Zz4=' as WalletIcon;

type RequiredSolanaFeatures = StandardConnectFeature &
  StandardDisconnectFeature &
  StandardEventsFeature &
  SolanaSignMessageFeature &
  SolanaSignTransactionFeature &
  SolanaSignAndSendTransactionFeature &
  SolanaSignAndSendAllTransactionsFeature;

export type SolanaWallet = Wallet & {
  features: Wallet['features'] & RequiredSolanaFeatures;
};

export function isCompatibleSolanaWallet(wallet: Wallet): wallet is SolanaWallet {
  return (
    wallet.chains.includes(SOLANA_WALLET_STANDARD_MAINNET) &&
    StandardConnect in wallet.features &&
    StandardDisconnect in wallet.features &&
    StandardEvents in wallet.features &&
    SolanaSignMessage in wallet.features &&
    SolanaSignTransaction in wallet.features &&
    SolanaSignAndSendTransaction in wallet.features &&
    SignAndSendAllTransactions in wallet.features
  );
}

function accountFromAddress(address: string): WalletAccount {
  try {
    const publicKey = Base58.toBytes(address);
    if (publicKey.length !== 32) {
      throw standardErrors.rpc.internal('Solana account must decode to 32 bytes');
    }
    return new ReadonlyWalletAccount({
      address,
      publicKey,
      chains: [SOLANA_WALLET_STANDARD_MAINNET],
      features: SOLANA_ACCOUNT_FEATURES,
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
  const restored = activeSession(transport.readSession());
  let accounts: readonly WalletAccount[] = [];

  const updateAccounts = (addresses: string[]) => {
    if (
      accounts.length === addresses.length &&
      accounts.every((account, index) => account.address === addresses[index])
    ) {
      return;
    }
    accounts = addresses.map(accountFromAddress);
    listeners.forEach((listener) => listener({ accounts }));
  };

  updateAccounts(restored ? projectSolanaAccounts(restored) : []);
  session.subscribe((nextSession) => {
    updateAccounts(nextSession ? projectSolanaAccounts(nextSession) : []);
  });

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
        if (options?.silent && accounts.length === 0) return { accounts };
        const result = await handleSolanaRequest(transport, { method: 'connect' });
        updateAccounts(result);
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
        updateAccounts([]);
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

  const wallet: SolanaWallet = {
    version: '1.0.0',
    name: 'Coinbase Wallet',
    icon: COINBASE_WALLET_ICON,
    chains: [SOLANA_WALLET_STANDARD_MAINNET],
    features,
    get accounts() {
      return accounts;
    },
  };
  return wallet;
}
