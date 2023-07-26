// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { AddressString, HexString, ProviderType } from '../types';
import { Web3Method } from './Web3Method';

interface BaseWeb3Response<Result> {
  method: Web3Method;
  errorMessage?: string | null;
  result?: Result;
}

export interface ErrorResponse extends BaseWeb3Response<void> {
  errorCode?: number;
  errorMessage: string;
}

export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    (response as ErrorResponse)?.method !== undefined &&
    (response as ErrorResponse)?.errorMessage !== undefined
  );
}

export type RequestEthereumAccountsResponse = BaseWeb3Response<
  AddressString[] // an array of ethereum addresses
>;

export type ConnectAndSignInResponse = BaseWeb3Response<{
  accounts: AddressString[];
  message: HexString;
  signature: HexString;
}>;

export type AddEthereumChainResponse = BaseWeb3Response<AddResponse>; // was request approved

export type WatchAssetResponse = BaseWeb3Response<boolean>;

export type SelectProviderResponse = BaseWeb3Response<ProviderType>;

export type AddResponse = {
  isApproved: boolean;
  rpcUrl: string;
};

export function AddEthereumChainResponse(addResponse: AddResponse): SwitchEthereumChainResponse {
  return {
    method: Web3Method.addEthereumChain,
    result: addResponse,
  };
}

export type SwitchEthereumChainResponse = BaseWeb3Response<SwitchResponse>; // was request approved

export type SwitchResponse = {
  isApproved: boolean;
  rpcUrl: string;
};

export function SwitchEthereumChainResponse(
  switchResponse: SwitchResponse
): SwitchEthereumChainResponse {
  return {
    method: Web3Method.switchEthereumChain,
    result: switchResponse,
  };
}

export function RequestEthereumAccountsResponse(
  addresses: AddressString[]
): RequestEthereumAccountsResponse {
  return { method: Web3Method.requestEthereumAccounts, result: addresses };
}

export function WatchAssetReponse(success: boolean): WatchAssetResponse {
  return { method: Web3Method.watchAsset, result: success };
}

export function SelectProviderResponse(selectedProviderKey: ProviderType): SelectProviderResponse {
  return { method: Web3Method.selectProvider, result: selectedProviderKey };
}

export function isRequestEthereumAccountsResponse(
  res: any
): res is RequestEthereumAccountsResponse {
  return res && res.method === Web3Method.requestEthereumAccounts;
}

export function SignEthereumMessageResponse(signature: HexString): SignEthereumMessageResponse {
  return { method: Web3Method.signEthereumMessage, result: signature };
}

export type SignEthereumMessageResponse = BaseWeb3Response<HexString>; // signature

export function SignEthereumTransactionResponse(
  signedData: HexString
): SignEthereumTransactionResponse {
  return { method: Web3Method.signEthereumTransaction, result: signedData };
}

export type SignEthereumTransactionResponse = BaseWeb3Response<HexString>; // signed transaction

export function SubmitEthereumTransactionResponse(
  txHash: HexString
): SubmitEthereumTransactionResponse {
  return { method: Web3Method.submitEthereumTransaction, result: txHash };
}

export type SubmitEthereumTransactionResponse = BaseWeb3Response<HexString>; // transaction hash

export function EthereumAddressFromSignedMessageResponse(
  address: AddressString
): EthereumAddressFromSignedMessageResponse {
  return {
    method: Web3Method.ethereumAddressFromSignedMessage,
    result: address,
  };
}

export type EthereumAddressFromSignedMessageResponse = BaseWeb3Response<AddressString>; // ethereum address

export type ScanQRCodeResponse = BaseWeb3Response<string>; // scanned string

export type GenericResponse = BaseWeb3Response<string>; // response data

export type MakeEthereumJSONRPCResponse = BaseWeb3Response<unknown>;

export type Web3Response =
  | ErrorResponse
  | RequestEthereumAccountsResponse
  | ConnectAndSignInResponse
  | SignEthereumMessageResponse
  | SignEthereumTransactionResponse
  | SubmitEthereumTransactionResponse
  | EthereumAddressFromSignedMessageResponse
  | ScanQRCodeResponse
  | GenericResponse
  | AddEthereumChainResponse
  | SwitchEthereumChainResponse
  | MakeEthereumJSONRPCResponse;
