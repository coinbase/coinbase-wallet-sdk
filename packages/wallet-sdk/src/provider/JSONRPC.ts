// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import BN from 'bn.js';

import { AddressString, HexString, IntNumber } from '../core/type';

export type JSONRPCMethodName = keyof typeof JSONRPCMethods;

export function isValidJSONRPCMethod(method: string): method is JSONRPCMethodName {
  return method in JSONRPCMethods;
}

export type JSONRPCRequest<M extends JSONRPCMethodName> = {
  jsonrpc: '2.0';
  id: number;
  method: M;
  params: (typeof JSONRPCMethods)[M]['params'];
};

export type JSONRPCResponse<M extends JSONRPCMethodName> = {
  jsonrpc: '2.0';
  id: number;
} & (
  | {
      error: {
        code: number;
        message: string;
        data?: unknown;
      };
    }
  | {
      result: (typeof JSONRPCMethods)[M]['result'];
    }
);

const JSONRPCMethods = {
  eth_accounts: {
    params: null,
    result: {} as AddressString[],
  },
  eth_coinbase: {
    params: null,
    result: {} as AddressString,
  },
  net_version: {
    params: null,
    result: {} as string,
  },
  eth_chainId: {
    params: null,
    result: {} as string,
  },
  eth_uninstallFilter: {
    params: {} as [HexString],
    result: {} as boolean,
  },
  eth_requestAccounts: {
    params: null,
    result: {} as AddressString[],
  },
  eth_sign: {
    params: {} as [AddressString, Buffer],
    result: {} as HexString,
  },
  eth_ecRecover: {
    params: {} as [Buffer, Buffer],
    result: {} as AddressString,
  },
  personal_sign: {
    params: {} as [Buffer, AddressString],
    result: {} as HexString,
  },
  personal_ecRecover: {
    params: {} as [Buffer, Buffer],
    result: {} as AddressString,
  },
  eth_signTransaction: {
    params: {} as EthereumTransactionParams,
    result: {} as HexString,
  },
  eth_sendRawTransaction: {
    params: {} as [Buffer],
    result: {} as HexString,
  },
  eth_sendTransaction: {
    params: {} as EthereumTransactionParams,
    result: {} as HexString,
  },
  eth_signTypedData_v1: {
    params: {} as [object, AddressString],
    result: {} as HexString,
  },
  eth_signTypedData_v2: {
    params: null,
    result: {} as never,
  },
  eth_signTypedData_v3: {
    params: {} as [AddressString, object],
    result: {} as HexString,
  },
  eth_signTypedData_v4: {
    params: {} as [AddressString, object],
    result: {} as HexString,
  },
  eth_signTypedData: {
    params: {} as [AddressString, object],
    result: {} as HexString,
  },
  wallet_addEthereumChain: {
    params: {} as [
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
    ],
    result: null,
  },
  wallet_switchEthereumChain: {
    params: {} as [
      {
        chainId: string;
      },
    ],
    result: null,
  },
  wallet_watchAsset: {
    params: {} as {
      type: string;
      options: {
        address: string;
        symbol: string;
        decimals: number;
        image?: string;
      };
    },
    result: {} as boolean,
  },
  eth_subscribe: {
    params: {} as [
      'newHeads' | 'logs' | 'newPendingTransactions' | 'syncing',
      {
        address?: AddressString;
        topics?: string[];
      },
    ],
    result: {} as unknown,
  },
  eth_unsubscribe: {
    params: {} as string[],
    result: {} as unknown,
  },
  eth_newFilter: {
    params: {} as unknown,
    result: {} as HexString,
  },
  eth_newBlockFilter: {
    params: null,
    result: {} as HexString,
  },
  eth_newPendingTransactionFilter: {
    params: null,
    result: {} as HexString,
  },
  eth_getFilterChanges: {
    params: {} as [HexString],
    result: {} as unknown,
  },
  eth_getFilterLogs: {
    params: {} as [HexString],
    result: {} as unknown,
  },
} as const;

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
