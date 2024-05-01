import { LIB_VERSION } from '../../version';
import { CrossDomainCommunicator } from ':core/communicator/CrossDomainCommunicator';
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

  protected setupPeerWindow(): Promise<void> {
    this.openFixedSizePopUpWindow();
    return new Promise((resolve) => (this.resolveConnection = resolve));
  }

  protected async handleIncomingMessage(message: Message) {
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
    }
    return false;
  }

  // Window Management

  private openFixedSizePopUpWindow() {
    const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
    const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

    this.peerWindow = window.open(
      this.url,
      'Smart Wallet',
      `width=${POPUP_WIDTH}, height=${POPUP_HEIGHT}, left=${left}, top=${top}`
    );

    this.peerWindow?.focus();
  }

  private closeChildWindow() {
    if (this.peerWindow && !this.peerWindow.closed) {
      this.peerWindow.close();
    }
    this.peerWindow = null;
  }
}
