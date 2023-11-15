// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { AddressString, HexString, ProviderType } from '../types';
import { Web3Method } from './Web3Method';

type ErrorResponse = {
  errorCode?: number;
  errorMessage: string;
};

export function isErrorResponse(response: Web3Response) {
  return (response as ErrorResponse).errorMessage !== undefined;
}

export type Web3Response =
  | ({
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
    ))
  | ErrorResponse;
