import { getWallets } from '@wallet-standard/app';
import type { Wallet } from '@wallet-standard/base';
import { StandardConnect, type StandardConnectFeature } from '@wallet-standard/features';

export type ConnectableSolanaWallet = Wallet & {
  features: Wallet['features'] & StandardConnectFeature;
};

function isConnectableCoinbaseWallet(wallet: Wallet): wallet is ConnectableSolanaWallet {
  return wallet.name === 'Coinbase Wallet' && StandardConnect in wallet.features;
}

/** Find the Coinbase Wallet Standard implementation registered by the current host. */
export function getInjectedSolanaWallet(): ConnectableSolanaWallet | null {
  return getWallets().get().find(isConnectableCoinbaseWallet) ?? null;
}
