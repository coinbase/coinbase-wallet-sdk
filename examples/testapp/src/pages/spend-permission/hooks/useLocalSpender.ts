import { useCallback, useEffect, useState } from 'react';
import { createPublicClient, formatUnits, getAddress, http } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

import { NETWORKS, SPENDER_ACCOUNT_STORAGE_KEY } from '../constants';
import type { SpenderBalance } from '../types';

export function useLocalSpender() {
  const [localSpenderAddress, setLocalSpenderAddress] = useState<string | null>(null);
  const [localSpenderPrivateKey, setLocalSpenderPrivateKey] = useState<string | null>(null);
  const [spenderBalances, setSpenderBalances] = useState<SpenderBalance[]>([]);
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);

  // Initialize or load local spender account
  useEffect(() => {
    const storedPK = localStorage.getItem(SPENDER_ACCOUNT_STORAGE_KEY);
    if (storedPK) {
      try {
        const account = privateKeyToAccount(storedPK as `0x${string}`);
        setLocalSpenderAddress(account.address);
        setLocalSpenderPrivateKey(storedPK);
      } catch {
        // Invalid stored key, generate new one
        generateNewSpender();
      }
    } else {
      generateNewSpender();
    }
  }, []);

  const generateNewSpender = useCallback(() => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    localStorage.setItem(SPENDER_ACCOUNT_STORAGE_KEY, pk);
    setLocalSpenderPrivateKey(pk);
    setLocalSpenderAddress(account.address);
  }, []);

  // Fetch balances for local spender on all chains
  const fetchSpenderBalances = useCallback(async () => {
    if (!localSpenderAddress) return;

    setIsFetchingBalances(true);
    try {
      const balances: SpenderBalance[] = await Promise.all(
        NETWORKS.map(async (network) => {
          try {
            const client = createPublicClient({
              chain: network.chain,
              transport: http(),
            });
            const balance = await client.getBalance({ address: getAddress(localSpenderAddress) });
            return {
              chainId: network.chainId,
              chainName: network.name,
              balance: formatUnits(balance, 18),
              color: network.color,
            };
          } catch {
            return {
              chainId: network.chainId,
              chainName: network.name,
              balance: '0',
              color: network.color,
            };
          }
        })
      );
      setSpenderBalances(balances);
    } finally {
      setIsFetchingBalances(false);
    }
  }, [localSpenderAddress]);

  // Auto-fetch balances when address is available
  useEffect(() => {
    if (localSpenderAddress) {
      fetchSpenderBalances();
    }
  }, [localSpenderAddress, fetchSpenderBalances]);

  return {
    localSpenderAddress,
    localSpenderPrivateKey,
    spenderBalances,
    isFetchingBalances,
    generateNewSpender,
    fetchSpenderBalances,
  };
}
