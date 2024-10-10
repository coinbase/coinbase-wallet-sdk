import { SerializedEthereumRpcError } from '../error/utils.js';
import { Message, MessageID } from './Message.js';
import { RequestArguments } from ':core/provider/interface.js';

interface RPCMessage extends Message {
  id: MessageID;
  sender: string; // hex encoded public key of the sender
  content: unknown;
  timestamp: Date;
}

export type EncryptedData = {
  iv: ArrayBuffer;
  cipherText: ArrayBuffer;
};

export interface RPCRequestMessage extends RPCMessage {
  content:
    | {
        handshake: RequestArguments;
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
