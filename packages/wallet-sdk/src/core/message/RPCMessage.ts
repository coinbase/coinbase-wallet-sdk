import { Message, MessageID } from './Message';
import { SerializedEthereumRpcError } from ':core/error';
import { RequestArguments } from ':core/provider/interface';

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

export type MobileEncryptedData = {
  iv: Uint8Array;
  cipherText: Uint8Array;
};

export interface RPCRequestMessage extends RPCMessage {
  callbackUrl?: string;
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

export interface MobileRPCResponseMessage extends RPCMessage {
  requestId: MessageID;
  content:
    | {
        encrypted: MobileEncryptedData;
      }
    | {
        failure: SerializedEthereumRpcError;
      };
}
