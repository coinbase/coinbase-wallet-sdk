import { UUID } from 'crypto';

import { EncryptedData } from '../../sign/scw/SCWCipher';
import { RequestAccountsAction } from './Action';
import { SerializedEthereumRpcError } from ':core/error';
import { Message } from ':core/message/Message';

interface SCWMessage extends Message {
  type: 'web3';
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
