import { randomUUID, UUID } from 'crypto';

import { MessageEnvelope, MessageEnvelopeResponse } from '../type/PopUpCommunicatorMessage';

// TODO: how to set/change configurations?
const POPUP_WIDTH = 688;
const POPUP_HEIGHT = 621;

type PopUpCommunicatorOptions = {
  url: string;
};

export class PopUpCommunicator {
  private childWindow: Window | null = null;
  private requestResolutions = new Map<UUID, (_: MessageEnvelopeResponse) => void>();

  url: string;

  constructor({ url }: PopUpCommunicatorOptions) {
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

          if (event.data.message === 'popupReadyForRequest') {
            resolve();
          }
        },
        { once: true }
      );

      window.addEventListener('message', (event) => {
        if (event.origin !== new URL(this.url).origin) {
          return;
        }

        this.requestResolutions.get(event.data.id)?.(event.data);
      });
    });
  }

  send(requestMessage: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.childWindow) {
        reject(new Error('No pop up window found. Make sure to run .connect() before .send()'));
      }

      const messageEnvelope: MessageEnvelope = { id: randomUUID(), content: requestMessage };
      this.childWindow?.postMessage(messageEnvelope, new URL(this.url).origin);

      this.requestResolutions.set(messageEnvelope.id, (response) => {
        resolve(response);
        this.requestResolutions.delete(messageEnvelope.id);
      });
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
