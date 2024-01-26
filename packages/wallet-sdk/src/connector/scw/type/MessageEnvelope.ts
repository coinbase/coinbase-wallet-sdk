import { UUID } from 'crypto';

import { Message } from '../../../lib/CrossDomainCommunicator';
import { Request } from './Request';
import { Response } from './Response';

export type RequestEnvelope =
  | {
      type: 'selectConnectionType';
      id: UUID;
    }
  | {
      type: 'web3Request';
      id: UUID;
      content: Request;
    };

export const POPUP_LISTENER_ADDED_MESSAGE = { type: 'popupListenerAdded' };
export const DAPP_ORIGIN_MESSAGE = { type: 'dappOriginMessage' };
export const POPUP_READY_MESSAGE = { type: 'popupReadyForRequest' };

export type ResponseEnvelope =
  | {
      type: 'connectionTypeSelected';
      id: UUID;
      requestId: UUID;
      relay: 'scw' | 'walletlink' | 'extension';
    }
  | {
      type: 'web3Response';
      id: UUID;
      requestId: UUID;
      response: Response;
    };

export function isResponseEnvelope(message: Message): message is ResponseEnvelope {
  return 'requestId' in message;
}
