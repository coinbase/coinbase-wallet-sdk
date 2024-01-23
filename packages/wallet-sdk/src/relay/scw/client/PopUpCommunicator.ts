import { UUID } from 'crypto';

import { CrossDomainCommunicator, Message } from '../../../lib/CrossDomainCommunicator';
import {
  isResponseEnvelope,
  POPUP_READY_MESSAGE,
  RequestEnvelope,
  ResponseEnvelope,
} from '../type/MessageEnvelope';
import { SCWWeb3Request } from '../type/SCWWeb3Request';

// TODO: how to set/change configurations?
const POPUP_WIDTH = 688;
const POPUP_HEIGHT = 621;
const SCW_FE_URL = 'https://scw-dev.cbhq.net/';

export class PopUpCommunicator extends CrossDomainCommunicator {
  static shared: PopUpCommunicator = new PopUpCommunicator({ url: SCW_FE_URL });

  private requestResolutions = new Map<UUID, (_: ResponseEnvelope) => void>();

  protected onConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.peerWindow) {
        this.closeChildWindow();
      }

      this.openFixedSizePopUpWindow();

      if (!this.peerWindow) {
        reject(new Error('No pop up window opened'));
      }

      window.addEventListener(
        'message',
        (event) => {
          if (event.origin !== this.url.origin) {
            return;
          }

          if (event.data.type === POPUP_READY_MESSAGE.type) {
            resolve();
          }
        },
        { once: true }
      );
    });
  }

  protected onMessage(message: Message) {
    if (!isResponseEnvelope(message)) return;

    const requestId = message.requestId;
    const resolveFunction = this.requestResolutions.get(requestId);
    this.requestResolutions.delete(requestId);
    resolveFunction?.(message);
  }

  selectRelayType(): Promise<Extract<ResponseEnvelope, { type: 'relaySelected' }>> {
    return new Promise((resolve, reject) => {
      if (!this.peerWindow) {
        reject(new Error('No pop up window found. Make sure to run .connect() before .send()'));
      }

      const messageEnvelope: RequestEnvelope = {
        id: crypto.randomUUID(),
        type: 'selectRelayType',
      };
      this.peerWindow?.postMessage(messageEnvelope, this.url.origin);

      this.requestResolutions.set(messageEnvelope.id, (resEnv) =>
        resolve(resEnv as Extract<ResponseEnvelope, { type: 'relaySelected' }>)
      );
    });
  }

  request(request: SCWWeb3Request): Promise<Extract<ResponseEnvelope, { type: 'web3Response' }>> {
    return new Promise((resolve, reject) => {
      if (!this.peerWindow) {
        reject(new Error('No pop up window found. Make sure to run .connect() before .send()'));
      }

      const messageEnvelope: RequestEnvelope = {
        type: 'web3Request',
        id: crypto.randomUUID(),
        content: request,
      };
      this.postMessage(messageEnvelope);

      this.requestResolutions.set(messageEnvelope.id, (resEnv) =>
        resolve(resEnv as Extract<ResponseEnvelope, { type: 'web3Response' }>)
      );
    });
  }

  protected onDisconnect() {
    this.closeChildWindow();
    this.requestResolutions.clear();
  }

  private openFixedSizePopUpWindow() {
    const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
    const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

    const urlParams = new URLSearchParams();
    urlParams.append('opener', encodeURIComponent(window.location.href));

    const popupUrl = new URL(this.url);
    popupUrl.search = urlParams.toString();

    const popupWindow = window.open(
      popupUrl,
      'SCW Child Window',
      `width=${POPUP_WIDTH}, height=${POPUP_HEIGHT}, left=${left}, top=${top}`
    );

    this.peerWindow = popupWindow;
    popupWindow?.focus();
  }

  private closeChildWindow() {
    if (this.peerWindow && !this.peerWindow.closed) {
      this.peerWindow.close();
    }
    this.peerWindow = null;
  }
}
