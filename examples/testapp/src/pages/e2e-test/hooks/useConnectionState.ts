/**
 * Hook for managing wallet connection state
 *
 * Consolidates connection status, current account, and chain ID tracking.
 * Provides helper functions for ensuring connection is established.
 */

import { useCallback, useState } from 'react';
import type { EIP1193Provider } from 'viem';

// ============================================================================
// Types
// ============================================================================

export interface UseConnectionStateReturn {
  // State
  connected: boolean;
  currentAccount: string | null;
  allAccounts: string[];
  chainId: number | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setCurrentAccount: (account: string | null) => void;
  setAllAccounts: (accounts: string[]) => void;
  setChainId: (chainId: number | null) => void;

  // Helpers
  updateConnectionFromProvider: (provider: EIP1193Provider) => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useConnectionState(): UseConnectionStateReturn {
  const [connected, setConnected] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<string | null>(null);
  const [allAccounts, setAllAccounts] = useState<string[]>([]);
  const [chainId, setChainId] = useState<number | null>(null);

  /**
   * Update connection state from provider
   * Queries provider for current account and chain ID
   */
  const updateConnectionFromProvider = useCallback(async (provider: EIP1193Provider) => {
    if (!provider) {
      return;
    }

    try {
      // Get accounts
      const accounts = (await provider.request({
        method: 'eth_accounts',
        params: [],
      })) as string[];

      if (accounts && accounts.length > 0) {
        setCurrentAccount(accounts[0]);
        setAllAccounts(accounts);
        setConnected(true);
      } else {
        setCurrentAccount(null);
        setAllAccounts([]);
        setConnected(false);
      }

      // Get chain ID
      const chainIdHex = (await provider.request({
        method: 'eth_chainId',
        params: [],
      })) as string;
      const chainIdNum = Number.parseInt(chainIdHex, 16);
      setChainId(chainIdNum);
    } catch (_error) {
      // Failed to update connection from provider - reset state
      setCurrentAccount(null);
      setAllAccounts([]);
      setConnected(false);
    }
  }, []);

  return {
    // State
    connected,
    currentAccount,
    allAccounts,
    chainId,

    // Actions
    setConnected,
    setCurrentAccount,
    setAllAccounts,
    setChainId,

    // Helpers
    updateConnectionFromProvider,
  };
}
