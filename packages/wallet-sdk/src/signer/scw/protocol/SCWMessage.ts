import { UUID } from 'crypto';

import { SerializedEthereumRpcError } from '../../../core/error/utils';
import { Message } from '../../../transport/CrossDomainCommunicator';
import { decrypt, encrypt, EncryptedData } from './key/Cipher';
import { RequestAccountsAction } from './type/Action';
import { SCWRequest } from './type/Request';
import { SCWResponse } from './type/Response';

interface SCWMessage extends Message {
  type: 'scw';
  id: UUID;
  sender: string; // hex encoded public key of the sender
  content: unknown;
  version: string;
  timestamp: Date;
}

export interface SCWRequestMessage extends SCWMessage {
  content:
    | {
        handshake: RequestAccountsAction;
      }
    | {
        encrypted: EncryptedData;
      };
}

export interface SCWResponseMessage extends SCWMessage {
  requestId: UUID;
  content:
    | {
        encrypted: EncryptedData;
      }
    | {
        failure: SerializedEthereumRpcError;
      };
}

function jsonFriendlyErrorReplacer(_: any, value: any) {
  if (value instanceof Error) {
    interface ExtendedError extends Error {
      code?: string;
    }
    const error = value as ExtendedError;

    return {
      ...(error.code && { code: error.code }),
      message: error.message,
    };
  }

  return value;
}

export async function encryptContent<T>(
  content: SCWRequest | SCWResponse<T>,
  sharedSecret: CryptoKey
): Promise<EncryptedData> {
  return encrypt(sharedSecret, JSON.stringify(content, jsonFriendlyErrorReplacer));
}

export async function decryptContent<R extends SCWRequest | SCWResponse<U>, U>(
  encryptedData: EncryptedData,
  sharedSecret: CryptoKey
): Promise<R> {
  return JSON.parse(await decrypt(sharedSecret, encryptedData));
}
