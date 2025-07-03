import { Address, Hex } from 'viem';

export type GetSubAccountRequest = {
  account: Address;
  domain: string;
};

export type GetSubAccountResponseItem = {
  address: Address;
  factory: Address;
  factoryCalldata: Hex;
};

export type GetSubAccountResponse = {
  subAccounts: GetSubAccountResponseItem[];
};

export type GetSubAccountSchema = {
  Method: 'wallet_getSubAccount';
  Parameters: [GetSubAccountRequest];
  ReturnType: GetSubAccountResponse;
};
