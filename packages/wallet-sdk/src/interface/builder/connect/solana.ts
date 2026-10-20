import {
  SOLANA_MAINNET_REQUIRED_SCOPES,
  createSolanaMainnetScopes,
} from ':core/namespaces/solana/index.js';
import { sessionCovers } from ':core/session/grants.js';
import { StandardConnect, type StandardConnectOutput } from '@wallet-standard/features';
import { getRegisteredSolanaWallet } from '../wallet-standard/getRegisteredSolanaWallet.js';
import type { ChainConnector } from './types.js';

/**
 * Read accounts from the registered Coinbase Wallet Standard wallet: the host's own, or the
 * popup wallet `sdk.solana.registerWallet` registers, which syncs from the stored session.
 */
async function connectRegisteredWallet(): Promise<StandardConnectOutput> {
  const wallet = getRegisteredSolanaWallet();
  if (!wallet) return { accounts: [] };
  return wallet.features[StandardConnect].connect({ silent: true });
}

export function createSolanaConnector(): ChainConnector {
  return {
    scopes: createSolanaMainnetScopes(),
    needsPopup: (stored) => !sessionCovers(stored, SOLANA_MAINNET_REQUIRED_SCOPES),
    readResult: async () => ({ solana: await connectRegisteredWallet() }),
    connectHost: async () => ({ solana: await connectRegisteredWallet() }),
  };
}
