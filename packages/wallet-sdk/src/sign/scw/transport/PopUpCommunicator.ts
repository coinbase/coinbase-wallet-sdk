import { UUID } from 'crypto';

import { ClientConfigEventType, isConfigMessage, SignerType } from './ConfigMessage';
import { PopUpConfigurator } from './PopUpConfigurator';
import { CrossDomainCommunicator } from ':core/communicator/CrossDomainCommunicator';
import { Message } from ':core/communicator/Message';
import { standardErrors } from ':core/error';

// TODO: how to set/change configurations?
const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

type Fulfillment = {
  message: Message;
  resolve: (_: Message) => void;
  reject: (_: Error) => void;
};

export class PopUpCommunicator extends CrossDomainCommunicator {
  private requestMap = new Map<UUID, Fulfillment>();
  private popUpConfigurator: PopUpConfigurator;

  constructor({ url }: { url: string }) {
    super();
    this.url = new URL(url);
    this.popUpConfigurator = new PopUpConfigurator({ communicator: this });
  }

  protected onConnect(): Promise<void> {
    return new Promise((resolve) => {
      this.popUpConfigurator.resolvePopupConnection = () => {
        this.connected = true;
        resolve();
      };
      this.openFixedSizePopUpWindow();
    });
  }

  protected onEvent(event: MessageEvent<Message>) {
    if (event.origin !== this.url?.origin) return;

    const message = event.data;
    if (isConfigMessage(message)) {
      this.popUpConfigurator.handleConfigMessage(message);
      return;
    }

    if (!this.connected) return;
    if (!('requestId' in message)) return;

    const requestId = message.requestId as UUID;
    const resolveFunction = this.requestMap.get(requestId)?.resolve;
    this.requestMap.delete(requestId);
    resolveFunction?.(message);
  }

  protected onDisconnect() {
    this.connected = false;
    this.closeChildWindow();
    this.requestMap.forEach((fulfillment, uuid, map) => {
      fulfillment.reject(standardErrors.provider.userRejectedRequest('Request rejected'));
      map.delete(uuid);
    });
    this.popUpConfigurator.onDisconnect();
  }

  setGetWalletLinkQRCodeUrlCallback(callback: () => string) {
    this.popUpConfigurator.getWalletLinkQRCodeUrlCallback = callback;
  }

  selectSignerType({ smartWalletOnly }: { smartWalletOnly: boolean }): Promise<SignerType> {
    return new Promise((resolve) => {
      this.popUpConfigurator.resolveSignerTypeSelection = resolve;
      this.popUpConfigurator.postClientConfigMessage(ClientConfigEventType.SelectConnectionType, {
        smartWalletOnly,
      });
    });
  }

  walletLinkQrScanned() {
    this.popUpConfigurator.postClientConfigMessage(ClientConfigEventType.WalletLinkQrScanned);
  }

  request(message: Message): Promise<Message> {
    return new Promise((resolve, reject) => {
      this.postMessage(message);

      const fulfillment: Fulfillment = {
        message,
        resolve,
        reject,
      };
      this.requestMap.set(message.id, fulfillment);
    });
  }

  // Window Management

  private openFixedSizePopUpWindow() {
    const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
    const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

    const urlParams = new URLSearchParams();
    urlParams.append('opener', encodeURIComponent(window.location.href));

    if (!this.url) {
      throw standardErrors.rpc.internal('No url provided in PopUpCommunicator');
    }
    const popupUrl = new URL(this.url);
    popupUrl.search = urlParams.toString();

    this.peerWindow = window.open(
      popupUrl,
      'SCW Child Window',
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
