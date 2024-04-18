import { Message, MessageID } from '.';
import { RequestAccountsAction } from './Action';
import { EncryptedData } from './Cipher';
import { SerializedEthereumRpcError } from ':core/error';

interface RPCMessage extends Message {
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
  requestId: MessageID;
  content:
    | {
        encrypted: EncryptedData;
      }
    | {
        failure: SerializedEthereumRpcError;
      };
}
