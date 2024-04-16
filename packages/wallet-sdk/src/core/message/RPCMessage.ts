import { UUID } from 'crypto';

import { Message } from '.';
import { RequestAccountsAction } from './Action';
import { EncryptedData } from './Cipher';
import { SerializedEthereumRpcError } from ':core/error';

interface RPCMessage extends Message {
  type: 'scw';
  id: UUID;
  sender: string; // hex encoded public key of the sender
  content: unknown;
  timestamp: Date;
}

export interface RPCRequestMessage extends RPCMessage {
  content:
    | {
        handshake: RequestAccountsAction;
      }
    | {
        encrypted: EncryptedData;
      };
}

export interface RPCResponseMessage extends RPCMessage {
  requestId: UUID;
  content:
    | {
        encrypted: EncryptedData;
      }
    | {
        failure: SerializedEthereumRpcError;
      };
}
