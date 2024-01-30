import { SupportedEthereumMethods } from './Action';
import { AddressString } from ':wallet-sdk/src/core/type';

type ErrorResponse = {
  error?: Error;
};

export type RequestAccountsActionResponse = {
  method: SupportedEthereumMethods.EthRequestAccounts;
  result?: AddressString[];
};

export type SignActionResponse = {
  method: SupportedEthereumMethods.PersonalSign;
  result?: string;
};

export type PersonalSignActionResponse = {
  method: SupportedEthereumMethods.PersonalSign;
  result?: string;
};

export type SignTypedDataV1ActionResponse = {
  method: SupportedEthereumMethods.EthSignTypedDataV1;
  result?: string;
};

export type SignTypedDataV3ActionResponse = {
  method: SupportedEthereumMethods.EthSignTypedDataV3;
  result?: string;
};

export type SignTypedDataV4ActionResponse = {
  method: SupportedEthereumMethods.EthSignTypedDataV4;
  result?: string;
};

export type SignTransactionActionResponse = {
  method: SupportedEthereumMethods.EthSignTransaction;
  result?: string;
};

export type SendTransactionActionResponse = {
  method: SupportedEthereumMethods.EthSendTransaction;
  result?: string;
};

export type SendRawTransactionActionResponse = {
  method: SupportedEthereumMethods.EthSendRawTransaction;
  result?: string;
};

type ResolvedActionResponse =
  | RequestAccountsActionResponse
  | SignActionResponse
  | PersonalSignActionResponse
  | SignTypedDataV1ActionResponse
  | SignTypedDataV3ActionResponse
  | SignTypedDataV4ActionResponse
  | SignTransactionActionResponse
  | SendTransactionActionResponse
  | SendRawTransactionActionResponse;

export type ActionResponse = ResolvedActionResponse & ErrorResponse;
