import type { Hex } from 'viem';

export type AccountType = 'EOA' | 'Smart Wallet';

export type ChainStatus = {
  chainId: number;
  chainName: string;
  accountType: AccountType;
  isEOA7702Delegated: boolean;
  hasPendingOwnershipChange: boolean;
  isDeployed: boolean;
  hasPermissionManagerAsOwner: boolean;
  bytecode: Hex | undefined;
  error?: string;
};

export type AllChainsStatus = Record<number, ChainStatus>;

export type TokenPrices = Record<string, number>;

export type FetchedPermission = {
  chainId: number;
  chainName: string;
  permissionHash?: string;
  account: string;
  token: string;
  allowance: string;
  period: number;
  start: number;
  end: number;
  spender: string;
  salt: string;
  extraData: string;
  signature: string;
  createdAt?: number;
};

export type SpenderBalance = {
  chainId: number;
  chainName: string;
  balance: string;
  color: string;
};

export type SpendResult = {
  success: boolean;
  message: string;
  txHashes?: string[];
  chainId?: number;
};
