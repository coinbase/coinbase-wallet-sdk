import { UUID } from 'crypto';

import { CrossDomainCommunicator } from '../../../lib/CrossDomainCommunicator';
import {
  DAPP_ORIGIN_MESSAGE,
  isResponseEnvelope,
  POPUP_LISTENER_ADDED_MESSAGE,
  POPUP_READY_MESSAGE,
  RequestEnvelope,
  ResponseEnvelope,
} from '../type/MessageEnvelope';
import { Request } from '../type/Request';

// TODO: how to set/change configurations?
const POPUP_WIDTH = 688;
const POPUP_HEIGHT = 621;

export class PopUpCommunicator extends CrossDomainCommunicator {
  private requestResolutions = new Map<UUID, (_: ResponseEnvelope) => void>();

  constructor({ url }: { url: string }) {
    super();
    this.url = new URL(url);
  }

  protected onConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // TODO: understand this better and decide if we need it
      // if (this.peerWindow) {
      //   this.closeChildWindow();
      // }
      this.openFixedSizePopUpWindow();

      if (!this.peerWindow) {
        reject(new Error('No pop up window opened'));
      }

      window.addEventListener('message', (event) => {
        if (event.origin !== this.url?.origin) {
          return;
        }

        if (event.data.type === POPUP_LISTENER_ADDED_MESSAGE.type) {
          // Handshake Step 2: After receiving POPUP_LISTENER_ADDED_MESSAGE from Dapp,
          // Dapp sends DAPP_ORIGIN_MESSAGE to FE to help FE confirm the origin of the Dapp
          const dappOriginMessage = { ...DAPP_ORIGIN_MESSAGE, id: crypto.randomUUID() };
          this.postMessage(dappOriginMessage);
        }

        if (event.data.type === POPUP_READY_MESSAGE.type) {
          // Handshake Step 4: After receiving POPUP_READY_MESSAGE from Dapp, FE knows that
          // Dapp is ready to receive requests, handshake is done
          this._connected = true;
          resolve();
        }
      });
    });
  }

  protected onMessage(messageEvent: MessageEvent) {
    if (messageEvent.origin !== this.url?.origin) return;
    if (!this._connected) return;

    const message = messageEvent.data;
    if (!isResponseEnvelope(message)) return;

    const requestId = message.requestId;
    const resolveFunction = this.requestResolutions.get(requestId);
    this.requestResolutions.delete(requestId);
    resolveFunction?.(message);
  }

  selectConnectionType(): Promise<Extract<ResponseEnvelope, { type: 'connectionTypeSelected' }>> {
    return new Promise((resolve, reject) => {
      if (!this.peerWindow) {
        reject(new Error('No pop up window found. Make sure to run .connect() before .send()'));
      }

      const messageEnvelope: RequestEnvelope = {
        id: crypto.randomUUID(),
        type: 'selectConnectionType',
      };
      this.postMessage(messageEnvelope);

      this.requestResolutions.set(messageEnvelope.id, (resEnv) =>
        resolve(resEnv as Extract<ResponseEnvelope, { type: 'connectionTypeSelected' }>)
      );
    });
  }

  request(request: Request): Promise<Extract<ResponseEnvelope, { type: 'web3Response' }>> {
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

    if (!this.url) {
      throw new Error('No url provided in PopUpCommunicator');
    }
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
