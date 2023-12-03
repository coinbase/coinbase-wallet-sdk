import BN from 'bn.js';

import { AddressString, HexString, IntNumber } from '../core/type';
import { JSONRPCMethod } from './JSONRPCMethod';

export type JSONRPCRequest<M extends JSONRPCMethod = JSONRPCMethod> = {
  jsonrpc: '2.0';
  id: number;
} & Extract<_JSONRPCRequest, { method: M }>;

type _JSONRPCRequest =
  | {
      method: 'eth_accounts';
      params: never;
    }
  | {
      method: 'eth_coinbase';
      params: never;
    }
  | {
      method: 'net_version';
      params: never;
    }
  | {
      method: 'eth_chainId';
      params: never;
    }
  | {
      method: 'eth_uninstallFilter';
      params: [HexString];
    }
  | {
      method: 'eth_requestAccounts';
      params: never;
    }
  | {
      method: 'eth_sign';
      params: [AddressString, Buffer];
    }
  | {
      method: 'eth_ecRecover';
      params: [Buffer, Buffer];
    }
  | {
      method: 'personal_sign';
      params: [Buffer, AddressString];
    }
  | {
      method: 'personal_ecRecover';
      params: [Buffer, Buffer];
    }
  | {
      method: 'eth_signTransaction';
      params: [EthereumTransactionParams];
    }
  | {
      method: 'eth_sendRawTransaction';
      params: [Buffer];
    }
  | {
      method: 'eth_sendTransaction';
      params: [EthereumTransactionParams];
    }
  | {
      method: 'eth_signTypedData_v1';
      params: [object, AddressString];
    }
  | {
      // This is not supported
      method: 'eth_signTypedData_v2';
      params: never;
    }
  | {
      method: 'eth_signTypedData_v3';
      params: [AddressString, object];
    }
  | {
      method: 'eth_signTypedData_v4';
      params: [AddressString, object];
    }
  | {
      method: 'eth_signTypedData';
      params: [AddressString, object];
    }
  | {
      method: 'wallet_addEthereumChain';
      params: [AddEthereumChainParams];
    }
  | {
      method: 'wallet_switchEthereumChain';
      params: [
        {
          chainId: string;
        },
      ];
    }
  | {
      method: 'wallet_watchAsset';
      params: WatchAssetParams | [WatchAssetParams];
    }
  | {
      method: 'eth_subscribe';
      params: [
        SubscriptionType,
        {
          address?: AddressString;
          topics?: string[];
        },
      ];
    }
  | {
      method: 'eth_unsubscribe';
      params: string[];
    }
  | {
      method: 'eth_newFilter';
      params: unknown[];
    }
  | {
      method: 'eth_newBlockFilter';
      params: never;
    }
  | {
      method: 'eth_newPendingTransactionFilter';
      params: never;
    }
  | {
      method: 'eth_getFilterChanges';
      params: [HexString];
    }
  | {
      method: 'eth_getFilterLogs';
      params: [HexString];
    }
  | {
      method: 'eth_getLogs';
      params: unknown;
    }
  | {
      method: 'eth_blockNumber';
      params: unknown;
    }
  | {
      method: 'eth_getBlockByNumber';
      params: unknown;
    };

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

type AddEthereumChainParams = {
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

type SubscriptionType = 'newHeads' | 'logs' | 'newPendingTransactions' | 'syncing';
