import { LIB_VERSION } from '../../version';
import { ConfigMessage, Message } from '../message';
import { closePopup, openPopup } from './PopUpCommunicator';
import { CB_KEYS_URL } from ':core/constants';
import { standardErrors } from ':core/error';

export class KeysPopupCommunicator {
  private url: URL;

  constructor(url: string = CB_KEYS_URL) {
    this.url = new URL(url);
  }

  async postMessage<M extends Message>(request: Message): Promise<M> {
    const popup = await this.waitForPopupLoaded();
    popup.postMessage(request, this.url.origin);

    const { id } = request;
    if (!id) return {} as M; // do not wait for response if no id
    return this.onMessage<M>(({ requestId }) => requestId === id);
  }

  async onMessage<M extends Message>(predicate: (_: Partial<M>) => boolean): Promise<M> {
    return new Promise((resolve, reject) => {
      const listener = (event: MessageEvent<M>) => {
        if (event.origin !== this.url.origin) return; // origin validation

        const message = event.data;
        if (predicate(message)) {
          resolve(message);
          window.removeEventListener('message', listener);
          this.listeners.delete(listener);
        }
      };

      window.addEventListener('message', listener);
      this.listeners.set(listener, { reject });
    });
  }

  private listeners = new Map<(_: MessageEvent) => void, { reject: (_: Error) => void }>();

  protected disconnect() {
    this.listeners.forEach(({ reject }, listener) => {
      reject(standardErrors.provider.userRejectedRequest('Request rejected'));
      window.removeEventListener('message', listener);
    });
    this.listeners.clear();
  }

  private popup: Window | null = null;
  private async waitForPopupLoaded(): Promise<Window> {
    if (this.popup) return this.popup;

    this.popup = openPopup(this.url);

    this.onMessage<ConfigMessage>(({ event }) => event === 'PopupUnload').then(() => {
      closePopup(this.popup);
      this.popup = null;
      this.disconnect();
    });

    return this.onMessage<ConfigMessage>(({ event }) => event === 'PopupLoaded')
      .then((message) => {
        this.postMessage({
          requestId: message.id,
          data: { version: LIB_VERSION },
        });
      })
      .then(() => {
        if (!this.popup) throw standardErrors.rpc.internal();
        return this.popup;
      });
  }
}
