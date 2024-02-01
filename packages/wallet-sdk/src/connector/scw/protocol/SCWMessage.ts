import { UUID } from 'crypto';

import { Message } from '../../../transport/CrossDomainCommunicator';
import { decrypt, encrypt, EncryptedData } from './key/Cipher';
import { SupportedEthereumMethods } from './type/Action';
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
        handshake: {
          method: SupportedEthereumMethods.EthRequestAccounts;
          params: {
            appName: string;
            appLogoUrl: string | null;
          };
        };
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
        error: Error;
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
