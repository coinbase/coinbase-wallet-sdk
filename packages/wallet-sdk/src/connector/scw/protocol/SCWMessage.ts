import { UUID } from 'crypto';

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
        failure: Error;
      };
}

export async function encryptContent<T>(
  content: SCWRequest | SCWResponse<T>,
  sharedSecret: CryptoKey
): Promise<EncryptedData> {
  return encrypt(sharedSecret, JSON.stringify(content));
}

export async function decryptContent<R extends SCWRequest | SCWResponse<U>, U>(
  encryptedData: EncryptedData,
  sharedSecret: CryptoKey
): Promise<R> {
  return JSON.parse(await decrypt(sharedSecret, encryptedData));
}
