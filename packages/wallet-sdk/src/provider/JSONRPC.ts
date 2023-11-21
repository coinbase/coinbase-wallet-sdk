// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import BN from 'bn.js';

import { AddressString, HexString, IntNumber } from '../core/type';

export type JSONRPCMethod = JSONRPCInterface['method'];

export function isJSONRPCRequest<M extends JSONRPCMethod>(
  request: unknown,
  method: M
): request is JSONRPCRequest<M> {
  return (
    typeof request === 'object' &&
    request !== null &&
    (request as JSONRPCRequest<M>).method === method
  );
}

export type JSONRPCRequest<M extends JSONRPCMethod = JSONRPCMethod> = {
  jsonrpc: '2.0';
  id: number;
  method: M;
  params: Extract<JSONRPCInterface, { method: M }>['params'];
};

export type JSONRPCResponse<M extends JSONRPCMethod = JSONRPCMethod> = {
  jsonrpc: '2.0';
  id: number;
  result: Extract<JSONRPCInterface, { method: M }>['result'];
};

// TODO: revisit if this is still needed
export type JSONRPCResponseError = {
  jsonrpc: '2.0';
  id: number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type JSONRPCInterface =
  | { method: 'eth_accounts'; params: null; result: AddressString[] }
  | { method: 'eth_coinbase'; params: null; result: AddressString }
  | { method: 'net_version'; params: null; result: string }
  | { method: 'eth_chainId'; params: null; result: string }
  | { method: 'eth_uninstallFilter'; params: [HexString]; result: boolean }
  | { method: 'eth_requestAccounts'; params: null; result: AddressString[] }
  | { method: 'eth_sign'; params: [AddressString, Buffer]; result: HexString }
  | { method: 'eth_ecRecover'; params: [Buffer, Buffer]; result: AddressString }
  | { method: 'personal_sign'; params: [Buffer, AddressString]; result: HexString }
  | { method: 'personal_ecRecover'; params: [Buffer, Buffer]; result: AddressString }
  | { method: 'eth_signTransaction'; params: EthereumTransactionParams; result: HexString }
  | { method: 'eth_sendRawTransaction'; params: [Buffer]; result: HexString }
  | { method: 'eth_sendTransaction'; params: EthereumTransactionParams; result: HexString }
  | { method: 'eth_signTypedData_v1'; params: [object, AddressString]; result: HexString }
  | { method: 'eth_signTypedData_v2'; params: null; result: never }
  | { method: 'eth_signTypedData_v3'; params: [AddressString, object]; result: HexString }
  | { method: 'eth_signTypedData_v4'; params: [AddressString, object]; result: HexString }
  | { method: 'eth_signTypedData'; params: [AddressString, object]; result: HexString }
  | {
      method: 'wallet_addEthereumChain';
      params: [
        {
          chainId: string;
          blockExplorerUrls?: string[];
          chainName?: string;
          iconUrls?: string[];
          rpcUrls?: string[];
          nativeCurrency?: {
            name: string;
            symbol: string;
            decimals: number;
          };
        },
      ];
      result: null;
    }
  | {
      method: 'wallet_switchEthereumChain';
      params: [
        {
          chainId: string;
        },
      ];
      result: null;
    }
  | { method: 'wallet_watchAsset'; params: WatchAssetParams | [WatchAssetParams]; result: boolean }
  | {
      method: 'eth_subscribe';
      params: [
        'newHeads' | 'logs' | 'newPendingTransactions' | 'syncing',
        {
          address?: AddressString;
          topics?: string[];
        },
      ];
      result: unknown;
    }
  | { method: 'eth_unsubscribe'; params: string[]; result: unknown }
  | { method: 'eth_newFilter'; params: unknown; result: HexString }
  | { method: 'eth_newBlockFilter'; params: null; result: HexString }
  | { method: 'eth_newPendingTransactionFilter'; params: null; result: HexString }
  | { method: 'eth_getFilterChanges'; params: [HexString]; result: unknown }
  | { method: 'eth_getFilterLogs'; params: [HexString]; result: unknown };

type EthereumTransactionParams = {
  fromAddress: AddressString;
  toAddress?: AddressString;
  weiValue: BN;
  data: Buffer;
  nonce?: IntNumber;
  gasPriceInWei?: BN;
  maxFeePerGas?: BN; // in wei
  maxPriorityFeePerGas?: BN; // in wei
  gasLimit?: BN;
  chainId: IntNumber;
};

type WatchAssetParams = {
  type: string;
  options: {
    address: string;
    symbol?: string;
    decimals?: number;
    image?: string;
  };
};
