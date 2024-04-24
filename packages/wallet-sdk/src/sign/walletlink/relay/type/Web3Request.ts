// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { Web3Method } from './Web3Method';
import { AddressString, BigIntString, HexString, IntNumber, RegExpString } from ':core/type';

export type Web3Request<M extends Web3Method = Web3Method> = Extract<_Web3Request, { method: M }>;

export type SupportedWeb3Method = Extract<Web3Method, _Web3Request['method']>;

type _Web3Request =
  | {
      method: 'requestEthereumAccounts';
      params: {
        appName: string;
        appLogoUrl: string | null;
      };
    }
  | {
      method: 'childRequestEthereumAccounts';
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
  | {
      method: 'watchAsset';
      params: {
        type: string;
        options: {
          address: string;
          symbol?: string;
          decimals?: number;
          image?: string;
        };
        chainId?: string;
      };
    };
