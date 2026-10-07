import { Address } from 'viem';
import type { SpendPermission } from '../../storage/schema.js';
export type { SpendPermission } from '../../storage/schema.js';

export type FetchPermissionsRequest = {
  method: 'coinbase_fetchPermissions';
  params: [{ account: Address; chainId: `0x${string}`; spender: Address }];
};

export type EmptyFetchPermissionsRequest = Omit<FetchPermissionsRequest, 'params'> & {
  params: undefined;
};

export type FetchPermissionsResponse = {
  permissions: SpendPermission[];
};
