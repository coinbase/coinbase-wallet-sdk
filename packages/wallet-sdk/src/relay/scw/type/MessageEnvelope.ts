import { UUID } from 'crypto';

import { SCWWeb3Request } from './SCWWeb3Request';
import { SCWWeb3Response } from './SCWWeb3Response';

export type RequestEnvelope =
  | {
      type: 'selectRelayType';
      id: UUID;
    }
  | {
      type: 'web3Request';
      id: UUID;
      content: SCWWeb3Request;
    };

export const POPUP_READY_MESSAGE = { type: 'popupReadyForRequest' };

export type ResponseEnvelope =
  | {
      type: 'relaySelected';
      requestId: UUID;
      relay: 'scw' | 'walletlink' | 'extension';
    }
  | {
      type: 'web3Response';
      requestId: UUID;
      response: SCWWeb3Response;
    };
