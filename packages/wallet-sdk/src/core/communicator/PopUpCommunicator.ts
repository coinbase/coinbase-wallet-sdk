import { LIB_VERSION } from '../../version';
import { CrossDomainCommunicator } from ':core/communicator/CrossDomainCommunicator';
import { standardErrors } from ':core/error';
import {
  ConfigEvent,
  ConfigResponseMessage,
  ConfigUpdateMessage,
  createMessage,
  isConfigUpdateMessage,
  Message,
  MessageID,
} from ':core/message';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

export class PopUpCommunicator extends CrossDomainCommunicator {
  private resolveWhenPopupLoaded: (() => void) | null = null;
  private onConfigUpdateMessage: (_: ConfigUpdateMessage) => void;

  constructor(params: { url: string; onConfigUpdateMessage: (_: ConfigUpdateMessage) => void }) {
    super();
    this.url = new URL(params.url);
    this.onConfigUpdateMessage = params.onConfigUpdateMessage;
  }

  protected setupPeerWindow(): Promise<void> {
    this.openFixedSizePopUpWindow();
    return new Promise((resolve) => (this.resolveWhenPopupLoaded = resolve));
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

  protected handleIncomingEvent(event: MessageEvent<Message>) {
    const message = event.data;
    const { requestId } = message;
    if (requestId) {
      this.requestMap.get(requestId)?.resolve?.(message);
      this.requestMap.delete(requestId);
      return;
    }
    if (isConfigUpdateMessage(message)) {
      this.handleIncomingConfigUpdate(message);
    }
  }

  private handleIncomingConfigUpdate(message: ConfigUpdateMessage) {
    switch (message.event) {
      case ConfigEvent.PopupLoaded: {
        // Handshake Step 2: After receiving PopupHello from popup, Dapp sends DappHello
        // to FE to help FE confirm the origin of the Dapp, as well as SDK version.
        const response = createMessage<ConfigResponseMessage>({
          requestId: message.id,
          data: { version: LIB_VERSION },
        });
        this.postMessage(response);
        this.resolveWhenPopupLoaded?.();
        this.resolveWhenPopupLoaded = null;
        break;
      }
      case ConfigEvent.PopupUnload:
        this.disconnect();
        this.rejectWaitingRequests();
        this.closePeerWindow();
        break;
      default: // handle non-popup config update messages
        this.onConfigUpdateMessage(message);
    }
  }

  private rejectWaitingRequests() {
    this.requestMap.forEach(({ reject }) => {
      reject(standardErrors.provider.userRejectedRequest('Request rejected'));
    });
    this.requestMap.clear();
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

  private closePeerWindow() {
    if (this.peerWindow && !this.peerWindow.closed) {
      this.peerWindow.close();
    }
    this.peerWindow = null;
  }
}
