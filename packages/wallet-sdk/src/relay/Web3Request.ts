// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import {
  AddressString,
  BigIntString,
  HexString,
  IntNumber,
  ProviderType,
  RegExpString,
} from '../types';
import { Web3Method } from './Web3Method';

type ParamType = string | number | boolean | null | { [key: string]: ParamType } | ParamType[];

export type Web3Request = {
  method: Web3Method;
  params: { [key: string]: ParamType };
} & (
  | {
      method: 'requestEthereumAccounts';
      params: {
        appName: string;
        appLogoUrl: string | null;
      };
    }
  | {
      method: 'connectAndSignIn';
      params: {
        appName: string;
        appLogoUrl: string | null;
        domain: string;
        aud: string;
        version: string;
        type: string;
        nonce: string;
        iat: string;
        chainId: string;
        statement?: string;
        resources?: string[];
      };
    }
  | {
      method: 'addEthereumChain';
      params: {
        chainId: string;
        blockExplorerUrls?: string[];
        chainName?: string;
        iconUrls?: string[];
        rpcUrls: string[];
        nativeCurrency?: {
          name: string;
          symbol: string;
          decimals: number;
        };
      };
    }
  | {
      method: 'switchEthereumChain';
      params: {
        chainId: string;
        address?: string;
      };
    }
  | {
      method: 'signEthereumMessage';
      params: {
        message: HexString;
        address: AddressString;
        addPrefix: boolean;
        typedDataJson: string | null;
      };
    }
  | {
      method: 'signEthereumTransaction';
      params: {
        fromAddress: AddressString;
        toAddress: AddressString | null;
        weiValue: BigIntString;
        data: HexString;
        nonce: IntNumber | null;
        gasPriceInWei: BigIntString | null;
        maxFeePerGas: BigIntString | null; // in wei
        maxPriorityFeePerGas: BigIntString | null; // in wei
        gasLimit: BigIntString | null;
        chainId: IntNumber;
        shouldSubmit: boolean;
      };
    }
  | {
      method: 'submitEthereumTransaction';
      params: {
        signedTransaction: HexString;
        chainId: IntNumber;
      };
    }
  | {
      method: 'ethereumAddressFromSignedMessage';
      params: {
        message: HexString;
        signature: HexString;
        addPrefix: boolean;
      };
    }
  | {
      method: 'scanQRCode';
      params: {
        regExp: RegExpString;
      };
    }
  | {
      method: 'generic';
      params: {
        action: string;
        data: object;
      };
    }
  | { method: 'selectProvider'; params: { providerOptions: ProviderType[] } }
  | {
      method: 'makeEthereumJSONRPCRequest';
      params: {
        rpcMethod: string;
        rpcParams: unknown[];
        chainId: string;
      };
    }
  | {
      method: 'watchAsset';
      params: {
        address: string;
        symbol?: string;
        decimals?: number;
        image?: string;
      };
    }
);
