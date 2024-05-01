import { LIB_VERSION } from '../../version';
import { CrossDomainCommunicator } from ':core/communicator/CrossDomainCommunicator';
import { standardErrors } from ':core/error';
import {
  ConfigEvent,
  ConfigResponseMessage,
  createMessage,
  isConfigUpdateMessage,
  Message,
} from ':core/message';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

export class PopUpCommunicator extends CrossDomainCommunicator {
  private resolveConnection?: () => void;
  private onConfigUpdateMessage: (_: Message) => Promise<boolean>;

  constructor(params: { url: string; onConfigUpdateMessage: (_: Message) => Promise<boolean> }) {
    super();
    this.url = new URL(params.url);
    this.onConfigUpdateMessage = params.onConfigUpdateMessage;
  }

  protected async setupPeerWindow(): Promise<void> {
    this.openFixedSizePopUpWindow();
    return new Promise((resolve) => (this.resolveConnection = resolve));
  }

  protected async handleIncomingMessage(message: Message): Promise<boolean> {
    if (!isConfigUpdateMessage(message)) return false;
    switch (message.event) {
      case ConfigEvent.PopupLoaded:
        // Handshake Step 2: After receiving PopupHello from popup, Dapp sends DappHello
        // to FE to help FE confirm the origin of the Dapp, as well as SDK version.
        this.postMessage(
          createMessage<ConfigResponseMessage>({
            requestId: message.id,
            data: { version: LIB_VERSION },
          })
        );
        this.resolveConnection?.();
        this.resolveConnection = undefined;
        return true;
      case ConfigEvent.PopupUnload:
        this.disconnect();
        this.closeChildWindow();
        return true;
      default: // handle non-popup config update messages
        this.onConfigUpdateMessage(message);
    }
    return false;
  }

  // Window Management

  private openFixedSizePopUpWindow() {
    const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
    const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

    if (!this.url) {
      throw standardErrors.rpc.internal('No url provided in PopUpCommunicator');
    }
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
