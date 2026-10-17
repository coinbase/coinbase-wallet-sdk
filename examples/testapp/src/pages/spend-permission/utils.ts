import { formatUnits } from 'viem';

import { getNativeTokenSymbol } from './constants';

// Helper to parse chain ID from hex string
export const parseChainIdHex = (chainIdHex: string): number => {
  return Number.parseInt(chainIdHex, 16);
};

// Helper to format allowance with optional USD
export const formatAllowance = (
  allowance: string,
  chainId?: number,
  formatUsd?: (amount: string | number, chainId?: number | null) => string | null
): string => {
  try {
    const amount = formatUnits(BigInt(allowance), 18);
    const usdAmount = formatUsd?.(amount, chainId);
    const base = `${amount} ${getNativeTokenSymbol(chainId)}`;
    return usdAmount ? `${base} (${usdAmount})` : base;
  } catch {
    return allowance;
  }
};

// Helper to format timestamp
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString();
};

// Helper to format period in days
export const formatPeriod = (periodInSeconds: number): string => {
  const days = periodInSeconds / 86400;
  if (days === 1) return '1 day';
  if (days < 1) {
    const hours = periodInSeconds / 3600;
    if (hours < 1) {
      const minutes = periodInSeconds / 60;
      return `${minutes} min`;
    }
    return `${hours.toFixed(1)} hours`;
  }
  return `${days} days`;
};

// Helper to format date time
export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Helper to truncate address
export const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Helper to truncate hash
export const truncateHash = (hash: string, length = 8): string => {
  if (hash.length <= length * 2 + 3) return hash;
  return `${hash.slice(0, length)}...${hash.slice(-length)}`;
};
