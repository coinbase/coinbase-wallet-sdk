import { UUID } from 'crypto';

import { LIB_VERSION } from '../../version';
import { CrossDomainCommunicator } from './CrossDomainCommunicator';
import { standardErrors } from ':core/error';
import { Message } from ':core/message';
import {
  ConfigRequestMessage,
  ConfigResponseMessage,
  PopupSetupEvent,
} from ':core/message/ConfigMessage';

// TODO: how to set/change configurations?
const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

type Fulfillment = {
  resolve: (_: Message) => void;
  reject: (_: Error) => void;
};

export class PopUpCommunicator extends CrossDomainCommunicator {
  private requestMap = new Map<UUID, Fulfillment>();
  private resolveConnection?: () => void;

  constructor({ url }: { url: string }) {
    super();
    this.url = new URL(url);
  }

  request(message: Message): Promise<Message> {
    return new Promise((resolve, reject) => {
      this.postMessage(message);

      const fulfillment: Fulfillment = {
        resolve,
        reject,
      };
      this.requestMap.set(message.id, fulfillment);
    });
  }

  protected onConnect(): Promise<void> {
    return new Promise((resolve) => {
      this.resolveConnection = resolve;
      this.openFixedSizePopUpWindow();
    });
  }

  protected onEvent(event: MessageEvent<Message>) {
    if (event.origin !== this.url?.origin) return;

    const message = event.data;
    if (!('requestId' in message)) {
      this.handleIncomingRequest(message as ConfigRequestMessage);
      return;
    }

    const requestId = message.requestId as UUID;
    const resolveFunction = this.requestMap.get(requestId)?.resolve;
    this.requestMap.delete(requestId);
    resolveFunction?.(message);
  }

  protected onDisconnect() {
    this.closeChildWindow();
    this.requestMap.forEach((fulfillment, uuid, map) => {
      fulfillment.reject(standardErrors.provider.userRejectedRequest('Request rejected'));
      map.delete(uuid);
    });
  }

  private handleIncomingRequest(message: ConfigRequestMessage) {
    switch (message.event) {
      case PopupSetupEvent.Loaded: {
        const response: ConfigResponseMessage = {
          type: 'config',
          id: crypto.randomUUID(),
          version: LIB_VERSION,
          requestId: message.id,
          response: LIB_VERSION,
        };
        this.postMessage(response);
        this.resolveConnection?.();
        this.resolveConnection = undefined;
        break;
      }
      case PopupSetupEvent.Unload:
        this.disconnect();
        break;
    }
  }

  // Window Management

  private openFixedSizePopUpWindow() {
    const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
    const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

    if (!this.url) {
      throw standardErrors.rpc.internal('No url provided in PopUpCommunicator');
    }
    const popupUrl = new URL(this.url);
    this.peerWindow = window.open(
      popupUrl,
      'Smart Wallet',
      `width=${POPUP_WIDTH}, height=${POPUP_HEIGHT}, left=${left}, top=${top}`
    );

    this.peerWindow?.focus();

    if (!this.peerWindow) {
      throw standardErrors.rpc.internal('Pop up window failed to open');
    }
  }

  private closeChildWindow() {
    if (this.peerWindow && !this.peerWindow.closed) {
      this.peerWindow.close();
    }
    this.peerWindow = null;
  }
}
