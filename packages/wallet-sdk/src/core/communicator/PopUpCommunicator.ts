import { LIB_VERSION } from 'src/version';

import {
  ConfigEvent,
  ConfigResponseMessage,
  createMessage,
  isConfigUpdateMessage,
  Message,
  MessageID,
} from '../message';
import { standardErrors } from ':core/error';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

export class PopUpCommunicator {
  protected url: URL;
  private connected = false;

  private resolveConnection?: () => void;
  private onConfigUpdateMessage: (_: Message) => Promise<boolean>;

  constructor(params: { url: string; onConfigUpdateMessage: (_: Message) => Promise<boolean> }) {
    this.url = new URL(params.url);
    this.onConfigUpdateMessage = params.onConfigUpdateMessage;
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
        default: // handle non-popup config update messages
          this.onConfigUpdateMessage(message);
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
