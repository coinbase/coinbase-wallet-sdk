import { UUID } from 'crypto';

import { EncryptedData } from './SCWCipher';
import { RequestAccountsAction } from './type/Action';
import { Message } from ':core/communicator/Message';
import { SerializedEthereumRpcError } from ':core/error';

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
