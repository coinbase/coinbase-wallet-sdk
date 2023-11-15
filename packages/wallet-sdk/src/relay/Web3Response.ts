// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { AddressString, HexString, ProviderType } from '../types';
import { Web3Method } from './Web3Method';

export type Web3Response<M extends Web3Method = Web3Method> =
  | Extract<_Web3Response, { method: M }>
  | ErrorResponse;

type ErrorResponse = {
  errorCode?: number;
  errorMessage: string;
};

export function isErrorResponse(response: Web3Response): response is ErrorResponse {
  return (response as ErrorResponse).errorMessage !== undefined;
}

type _Web3Response = {
  method: Web3Method;
  result: unknown;
} & (
  | {
      method: 'connectAndSignIn';
      result: {
        accounts: AddressString[];
        message: HexString;
        signature: HexString;
      };
    }
  | {
      method: 'addEthereumChain';
      result: {
        isApproved: boolean;
        rpcUrl: string;
      };
    }
  | {
      method: 'switchEthereumChain';
      result: {
        isApproved: boolean;
        rpcUrl: string;
      };
    }
  | {
      method: 'requestEthereumAccounts';
      result: AddressString[];
    }
  | {
      method: 'watchAsset';
      result: boolean;
    }
  | {
      method: 'selectProvider';
      result: ProviderType;
    }
  | {
      method: 'signEthereumMessage';
      result: HexString;
    }
  | {
      method: 'signEthereumTransaction';
      result: HexString;
    }
  | {
      method: 'submitEthereumTransaction';
      result: HexString;
    }
  | {
      method: 'ethereumAddressFromSignedMessage';
      result: AddressString;
    }
  | {
      method: 'scanQRCode';
      result: string;
    }
  | {
      method: 'generic';
      result: string;
    }
  | {
      method: 'makeEthereumJSONRPCRequest';
      result: unknown;
    }
);
