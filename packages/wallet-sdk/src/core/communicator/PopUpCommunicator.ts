import { LIB_VERSION } from 'src/version';

import { ConfigMessage, Message } from '../message';
import { standardErrors } from ':core/error';
import { AppMetadata } from ':core/provider/interface';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

export class PopUpCommunicator {
  private url: URL;
  protected peerWindow: Window | null = null;
  private listeners: Array<(event: MessageEvent) => void> = [];

  constructor(
    url: string,
    private metadata: AppMetadata
  ) {
    this.url = new URL(url);
  }

  private postWalletLinkUpdate(data: unknown) {
    const update: ConfigMessage = {
      event: 'WalletLinkUpdate',
      data,
    };
    this.postMessage(update);
  }

  async postMessage<M extends Message>(request: Message): Promise<M> {
    if (!this.peerWindow) {
      this.peerWindow = await this.waitForPopupLoaded();
    }
    this.peerWindow.postMessage(request, this.url.origin);

    const { id } = request;
    if (!id) return {} as M; // do not wait for response if no id
    return this.onMessage<M>(({ requestId }) => requestId === id);
  }

  async onMessage<M extends Message>(predicate: (_: Partial<M>) => boolean): Promise<M> {
    return new Promise((resolve) => {
      const listener = (event: MessageEvent<M>) => {
        if (event.origin !== this.url.origin) return;
        const message = event.data;
        if (predicate(message)) {
          resolve(message);
          window.removeEventListener('message', listener);
        }
      };
      window.addEventListener('message', listener);
      this.listeners.push(listener);
    });
  }

  private async waitForPopupLoaded(): Promise<Window> {
    const popup = this.openPopup();

    this.onMessage<ConfigMessage>(({ event }) => event === 'PopupUnload').then(
      this.closeChildWindow.bind(this)
    );

    return this.onMessage<ConfigMessage>(({ event }) => event === 'PopupLoaded')
      .then((message) => {
        this.postMessage({
          requestId: message.id,
          data: { version: LIB_VERSION },
        });
      })
      .then(() => popup);
  }

  private openPopup(): Window {
    const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
    const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

    const popup = window.open(
      this.url,
      'Smart Wallet',
      `width=${POPUP_WIDTH}, height=${POPUP_HEIGHT}, left=${left}, top=${top}`
    );
    popup?.focus();
    if (!popup) {
      throw standardErrors.rpc.internal('Pop up window failed to open');
    }
    return popup;
  }

  private closeChildWindow() {
    if (this.peerWindow && !this.peerWindow.closed) {
      this.peerWindow.close();
    }
    this.peerWindow = null;

    this.listeners.forEach((listener) => {
      window.removeEventListener('message', listener);
    });
    this.listeners = [];
  }
}
