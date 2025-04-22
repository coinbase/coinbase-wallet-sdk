import { Address } from 'viem';

export type FetchPermissionsRequest = {
  method: 'coinbase_fetchPermissions';
  params: [{ account: Address; chainId: `0x${string}`; spender: Address }];
};

export type EmptyFetchPermissionsRequest = Omit<FetchPermissionsRequest, 'params'> & {
  params: undefined;
};

export type SpendLimit = {
  createdAt: number; // UTC timestamp for when the permission was granted
  permissionHash: string; // hex
  signature: string; // hex
  permission: {
    account: string; // address
    spender: string; // address
    token: string; // address
    allowance: string; // base 10 numeric string
    period: number; // unix seconds
    start: number; // unix seconds
    end: number; // unix seconds
    salt: string; // base 10 numeric string
    extraData: string; // hex
  };
};

export type FetchPermissionsResponse = {
  permissions: SpendLimit[];
};
