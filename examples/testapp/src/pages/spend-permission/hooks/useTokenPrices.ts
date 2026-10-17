import { useCallback, useEffect, useState } from 'react';

import { COINGECKO_IDS, getNativeTokenSymbol } from '../constants';
import type { TokenPrices } from '../types';

export function useTokenPrices() {
  const [tokenPrices, setTokenPrices] = useState<TokenPrices>({});

  const fetchTokenPrices = useCallback(async () => {
    try {
      const ids = Object.values(COINGECKO_IDS).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
      );
      const data = await response.json();

      const prices: TokenPrices = {};
      for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
        if (data[geckoId]?.usd) {
          prices[symbol] = data[geckoId].usd;
        }
      }
      setTokenPrices(prices);
    } catch {
      // Silently fail - USD prices are optional
    }
  }, []);

  // Fetch token prices on mount and refresh every 5 minutes
  useEffect(() => {
    fetchTokenPrices();
    const interval = setInterval(fetchTokenPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTokenPrices]);

  // Helper to format USD amount
  const formatUsd = useCallback(
    (amount: string | number, chainId?: number | null): string | null => {
      const symbol = getNativeTokenSymbol(chainId);
      const price = tokenPrices[symbol];
      if (!price) return null;

      const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      if (isNaN(numAmount)) return null;

      const usdValue = numAmount * price;
      if (usdValue < 0.01) {
        return `$${usdValue.toFixed(6)}`;
      }
      if (usdValue < 1) {
        return `$${usdValue.toFixed(4)}`;
      }
      return `$${usdValue.toFixed(2)}`;
    },
    [tokenPrices]
  );

  return { tokenPrices, formatUsd, fetchTokenPrices };
}
