import { WLSigner } from 'src/sign/walletlink/WLSigner';
import { LIB_VERSION } from 'src/version';

import { ConfigMessage, Message, SignerType } from '../message';
import { standardErrors } from ':core/error';
import { AppMetadata, Preference } from ':core/provider/interface';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

export class PopUpCommunicator {
  private listenForWalletLinkSessionRequest() {
    this.onMessage<ConfigMessage>(({ event }) => event === 'WalletLinkSessionRequest').then(
      async () => {
        const walletlink = new WLSigner({
          metadata: this.metadata,
        });
        this.postWalletLinkUpdate({ session: walletlink.getWalletLinkSession() });
        // Wait for the wallet link session to be established
        await walletlink.handshake();
        this.postWalletLinkUpdate({ connected: true });
      }
    );
  }

  private postWalletLinkUpdate(data: unknown) {
    this.postMessage({
      event: 'WalletLinkUpdate',
      data,
    } as ConfigMessage);
  }

  async requestSignerSelection(preference: Preference): Promise<SignerType> {
    this.listenForWalletLinkSessionRequest();

    const id = crypto.randomUUID();
    this.postMessage({
      id: crypto.randomUUID(),
      event: 'selectSignerType',
      data: preference,
    } as ConfigMessage);
    const response: ConfigMessage = await this.onMessage(({ requestId }) => requestId === id);
    return response.data as SignerType;
  }

  private url: URL;

  constructor(
    url: string,
    private metadata: AppMetadata
  ) {
    this.url = new URL(url);
  }

  private async connect() {
    if (this.peerWindow) return;
    await this.waitForPopupLoaded();
  }

  protected peerWindow: Window | null = null;

  private async postMessage<M extends Message>(message: M) {
    await this.connect();
    if (!this.peerWindow) {
      throw standardErrors.rpc.internal('Communicator: No peer window found');
    }
    this.peerWindow.postMessage(message, this.url.origin);
  }

  async postMessageForResponse(message: Message): Promise<Message> {
    this.postMessage(message);
    const response = await this.onMessage(({ requestId }) => requestId === message.id);
    return response;
  }

  private listeners: Array<(event: MessageEvent) => void> = [];

  private async onMessage<M extends Message>(predicate: (_: Partial<M>) => boolean): Promise<M> {
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

  private async waitForPopupLoaded() {
    this.openFixedSizePopUpWindow(); // this sets this.peerWindow
    this.onMessage<ConfigMessage>(({ event }) => event === 'PopupUnload').then(() =>
      this.closeChildWindow()
    );

    return this.onMessage<ConfigMessage>(({ event }) => event === 'PopupLoaded').then((message) => {
      this.postMessage({
        requestId: message.id,
        data: { version: LIB_VERSION },
      });
    });
  }

  private openFixedSizePopUpWindow() {
    const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
    const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

    this.peerWindow = window.open(
      this.url,
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

    this.listeners.forEach((listener) => {
      window.removeEventListener('message', listener);
    });
    this.listeners = [];
  }
}
