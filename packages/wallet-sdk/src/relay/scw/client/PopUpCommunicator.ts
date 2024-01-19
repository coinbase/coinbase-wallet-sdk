import { UUID } from 'crypto';

import { POPUP_READY_MESSAGE, RequestEnvelope, ResponseEnvelope } from '../type/MessageEnvelope';
import { SCWWeb3Request } from '../type/SCWWeb3Request';

// TODO: how to set/change configurations?
const POPUP_WIDTH = 688;
const POPUP_HEIGHT = 621;
const SCW_FE_URL = 'http://localhost:3000/';

type PopUpCommunicatorOptions = {
  url: string;
};

export class PopUpCommunicator {
  static shared: PopUpCommunicator = new PopUpCommunicator({ url: SCW_FE_URL });

  private childWindow: Window | null = null;
  private requestResolutions = new Map<UUID, (_: ResponseEnvelope) => void>();

  url: string;

  private constructor({ url }: PopUpCommunicatorOptions) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.childWindow) {
        this.closeChildWindow();
      }

      this.openFixedSizePopUpWindow(this.url);

      if (!this.childWindow) {
        reject(new Error('No pop up window opened'));
      }

      window.addEventListener(
        'message',
        (event) => {
          if (event.origin !== new URL(this.url).origin) {
            return;
          }

          if (event.data.type === POPUP_READY_MESSAGE.type) {
            resolve();
          }
        },
        { once: true }
      );

      window.addEventListener('message', (event) => {
        if (event.origin !== new URL(this.url).origin) {
          return;
        }

        const resolveFunction = this.requestResolutions.get(event.data.requestId);
        this.requestResolutions.delete(event.data.requestId);

        resolveFunction?.(event.data);
      });
    });
  }

  selectRelayType(): Promise<Extract<ResponseEnvelope, { type: 'relaySelected' }>> {
    return new Promise((resolve, reject) => {
      if (!this.childWindow) {
        reject(new Error('No pop up window found. Make sure to run .connect() before .send()'));
      }

      const messageEnvelope: RequestEnvelope = {
        id: crypto.randomUUID(),
        type: 'selectRelayType',
      };
      this.childWindow?.postMessage(messageEnvelope, new URL(this.url).origin);

      this.requestResolutions.set(messageEnvelope.id, (resEnv) =>
        resolve(resEnv as Extract<ResponseEnvelope, { type: 'relaySelected' }>)
      );
    });
  }

  request(request: SCWWeb3Request): Promise<Extract<ResponseEnvelope, { type: 'web3Response' }>> {
    return new Promise((resolve, reject) => {
      if (!this.childWindow) {
        reject(new Error('No pop up window found. Make sure to run .connect() before .send()'));
      }

      const messageEnvelope: RequestEnvelope = {
        type: 'web3Request',
        id: crypto.randomUUID(),
        content: request,
      };
      this.childWindow?.postMessage(messageEnvelope, new URL(this.url).origin);

      this.requestResolutions.set(messageEnvelope.id, (resEnv) =>
        resolve(resEnv as Extract<ResponseEnvelope, { type: 'web3Response' }>)
      );
    });
  }

  disconnect() {
    this.closeChildWindow();
    this.requestResolutions.clear();
  }

  private openFixedSizePopUpWindow(url: string) {
    const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
    const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

    const popupWindow = window.open(
      url,
      'SCW Child Window',
      `width=${POPUP_WIDTH}, height=${POPUP_HEIGHT}, left=${left}, top=${top}`
    );

    this.childWindow = popupWindow;
    popupWindow?.focus();
  }

  private closeChildWindow() {
    if (this.childWindow && !this.childWindow.closed) {
      this.childWindow.close();
    }
    this.childWindow = null;
  }
}
