import { AddressString } from ':wallet-sdk/src/core/type';

type ErrorResponse = {
  error?: Error;
};

export type RequestAccountsActionResponse = {
  method: 'eth_requestAccounts';
  result?: AddressString[];
} & ErrorResponse;

export type ActionResponse = RequestAccountsActionResponse;
