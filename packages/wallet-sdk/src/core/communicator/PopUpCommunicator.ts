import { StateUpdateListener } from 'src/sign/interface';
import { WLSigner } from 'src/sign/walletlink/WLSigner';
import { LIB_VERSION } from 'src/version';

import {
  ConfigEvent,
  ConfigResponseMessage,
  ConfigUpdateMessage,
  createMessage,
  isConfigUpdateMessage,
  Message,
  MessageID,
  SignerType,
} from '../message';
import { standardErrors } from ':core/error';
import { AppMetadata, Preference } from ':core/provider/interface';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

export class PopUpCommunicator {
  private connected = false;

  // temporary walletlink signer instance to handle WalletLinkSessionRequest
  // will revisit this when refactoring the walletlink signer
  private walletlinkSigner?: WLSigner;

  private async onWalletLinkSessionRequest() {
    if (!this.walletlinkSigner) {
      this.walletlinkSigner = new WLSigner({
        metadata: this.metadata,
        updateListener: {} as StateUpdateListener,
      });
    }

    this.postWalletLinkUpdate({ session: this.walletlinkSigner!.getWalletLinkSession() });
    // Wait for the wallet link session to be established
    await this.walletlinkSigner!.handshake();
    this.postWalletLinkUpdate({ connected: true });
  }

  private resolveConnection?: () => void;

  private postWalletLinkUpdate(data: unknown) {
    this.postMessage(
      createMessage<ConfigUpdateMessage>({
        event: ConfigEvent.WalletLinkUpdate,
        data,
      })
    );
  }

  async requestSignerSelection(preference: Preference): Promise<SignerType> {
    await this.connect();
    const message = createMessage<ConfigUpdateMessage>({
      event: ConfigEvent.SelectSignerType,
      data: preference,
    });
    const response = await this.postMessageForResponse(message);
    return (response as ConfigResponseMessage).data as SignerType;
  }

  private url: URL;

  constructor(
    url: string,
    private metadata: AppMetadata
  ) {
    this.url = new URL(url);
  }

  async connect() {
    if (this.connected) return;
    window.addEventListener('message', this.eventListener.bind(this));
    this.openFixedSizePopUpWindow();
    await new Promise<void>((resolve) => (this.resolveConnection = resolve));
    this.connected = true;
  }

  protected disconnect() {
    this.connected = false;
    window.removeEventListener('message', this.eventListener.bind(this));
    this.rejectWaitingRequests();
  }

  protected peerWindow: Window | null = null;

  async postMessage(message: Message) {
    if (!this.peerWindow) {
      throw standardErrors.rpc.internal('Communicator: No peer window found');
    }
    this.peerWindow.postMessage(message, this.url.origin);
  }

  async postMessageForResponse(message: Message): Promise<Message> {
    this.postMessage(message);
    return new Promise((resolve, reject) => {
      this.requestMap.set(message.id, {
        resolve,
        reject,
      });
    });
  }

  private requestMap = new Map<
    MessageID,
    {
      resolve: (_: Message) => void;
      reject: (_: Error) => void;
    }
  >();

  private eventListener(event: MessageEvent<Message>) {
    if (event.origin !== this.url?.origin) return;

    const message = event.data;
    const { requestId } = message;
    if (!requestId) {
      if (!isConfigUpdateMessage(message)) return;
      switch (message.event) {
        case ConfigEvent.PopupLoaded:
          this.postMessage(
            createMessage<ConfigResponseMessage>({
              requestId: message.id,
              data: { version: LIB_VERSION },
            })
          );
          this.resolveConnection?.();
          this.resolveConnection = undefined;
          break;
        case ConfigEvent.PopupUnload:
          this.disconnect();
          this.closeChildWindow();
          break;
        case ConfigEvent.WalletLinkSessionRequest:
          this.onWalletLinkSessionRequest();
          break;
      }
    }

    this.requestMap.get(requestId!)?.resolve?.(message);
    this.requestMap.delete(requestId!);
  }

  private rejectWaitingRequests() {
    this.requestMap.forEach(({ reject }) => {
      reject(standardErrors.provider.userRejectedRequest('Request rejected'));
    });
    this.requestMap.clear();
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
  }
}
