import { LIB_VERSION } from '../../version';
import { CrossDomainCommunicator } from ':core/communicator/CrossDomainCommunicator';
import { standardErrors } from ':core/error';
import { Message } from ':core/message';
import {
  ConfigEvent,
  ConfigResponseMessage,
  ConfigUpdateMessage,
  isConfigUpdateMessage,
} from ':core/message/ConfigMessage';

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

export class PopUpCommunicator extends CrossDomainCommunicator {
  private resolveConnection?: () => void;

  constructor({ url }: { url: string }) {
    super();
    this.url = new URL(url);
  }

  protected onConnect(): Promise<void> {
    return new Promise((resolve) => {
      this.resolveConnection = resolve;
      this.openFixedSizePopUpWindow();
    });
  }

  protected onEvent(event: MessageEvent<Message>) {
    const message = event.data;
    if (isConfigUpdateMessage(message)) {
      this.handleIncomingConfigUpdate(message);
    }
  }

  protected onDisconnect() {
    this.closeChildWindow();
  }

  private handleIncomingConfigUpdate(message: ConfigUpdateMessage) {
    switch (message.event) {
      case ConfigEvent.PopupLoaded:
        // Handshake Step 2: After receiving PopupHello from popup, Dapp sends DappHello
        // to FE to help FE confirm the origin of the Dapp, as well as SDK version.
        this.postMessage<ConfigResponseMessage>({
          requestId: message.id,
          data: { version: LIB_VERSION },
        });
        this.resolveConnection?.();
        this.resolveConnection = undefined;
        break;
      case ConfigEvent.PopupUnload:
        this.disconnect();
        break;
    }
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

  private closeChildWindow() {
    if (this.peerWindow && !this.peerWindow.closed) {
      this.peerWindow.close();
    }
    this.peerWindow = null;
  }
}
