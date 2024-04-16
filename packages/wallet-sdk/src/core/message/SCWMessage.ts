import { UUID } from 'crypto';

import { Message } from '.';
import { RequestAccountsAction } from './Action';
import { EncryptedData } from ':core/cipher/Cipher';
import { SerializedEthereumRpcError } from ':core/error';

interface SCWMessage extends Message {
  type: 'scw';
  id: UUID;
  sender: string; // hex encoded public key of the sender
  content: unknown;
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
