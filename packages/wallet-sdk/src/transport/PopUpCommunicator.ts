import { UUID } from 'crypto';

import {
  ClientConfigEventType,
  ConfigMessage,
  ConnectionType,
  HostConfigEventType,
  isConfigMessage,
} from './ConfigMessage';
import { CrossDomainCommunicator, Message } from './CrossDomainCommunicator';

// TODO: how to set/change configurations?
const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

export class PopUpCommunicator extends CrossDomainCommunicator {
  private requestResolutions = new Map<UUID, (_: Message) => void>();
  // TODO: let's revisit this when we migrate all this to ConnectionConfigurator.
  private _wlQRCodeUrlCallback?: () => string;

  constructor({ url }: { url: string }) {
    super();
    this.url = new URL(url);
  }

  // should be set before calling .connect()
  setWLQRCodeUrlCallback(callback: () => string) {
    this._wlQRCodeUrlCallback = callback;
  }

  protected onConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.resolvePopupReady = resolve;
      // TODO: understand this better and decide if we need it
      // if (this.peerWindow) {
      //   this.closeChildWindow();
      // }
      this.openFixedSizePopUpWindow();

      if (!this.peerWindow) {
        reject(new Error('No pop up window opened'));
      }
    });
  }

  private respondToWlQRCodeUrlRequest() {
    if (!this._wlQRCodeUrlCallback) {
      throw new Error(
        'PopUpCommunicator._wlQRCodeUrlCallback not set! make sure .setWLQRCodeUrlCallback is called first'
      );
    }
    const wlQRCodeUrl = this._wlQRCodeUrlCallback();
    const configMessage: ConfigMessage = {
      type: 'config',
      id: crypto.randomUUID(),
      event: {
        type: ClientConfigEventType.WalletLinkUrl,
        value: wlQRCodeUrl,
      },
    };
    this.postMessage(configMessage);
  }

  protected onEvent(event: MessageEvent<Message>) {
    if (event.origin !== this.url?.origin) return;

    const message = event.data;
    if (isConfigMessage(message)) {
      this.handleConfigMessage(message);
      return;
    }

    if (!this._connected) return;
    if (!('requestId' in message)) return;

    const requestId = message.requestId as UUID;
    const resolveFunction = this.requestResolutions.get(requestId);
    this.requestResolutions.delete(requestId);
    resolveFunction?.(message);
  }

  // TODO: move to ConnectionConfigurator
  private resolvePopupReady?: () => void;
  private resolveConnectionType?: (_: ConnectionType) => void;

  private handleConfigMessage(message: ConfigMessage) {
    switch (message.event.type) {
      case HostConfigEventType.PopupListenerAdded:
        // Handshake Step 2: After receiving POPUP_LISTENER_ADDED_MESSAGE from Dapp,
        // Dapp sends DAPP_ORIGIN_MESSAGE to FE to help FE confirm the origin of the Dapp
        this.postClientConfigMessage(ClientConfigEventType.DappOriginMessage);
        break;
      case HostConfigEventType.PopupReadyForRequest:
        // Handshake Step 4: After receiving POPUP_READY_MESSAGE from Dapp, FE knows that
        // Dapp is ready to receive requests, handshake is done
        this._connected = true;
        this.resolvePopupReady?.();
        this.resolvePopupReady = undefined;
        break;
      case HostConfigEventType.ConnectionTypeSelected:
        if (!this._connected) return;
        this.resolveConnectionType?.(message.event.value as ConnectionType);
        this.resolveConnectionType = undefined;
        break;
      case HostConfigEventType.RequestWalletLinkUrl:
        if (!this._connected) return;
        if (!this._wlQRCodeUrlCallback) {
          throw new Error('PopUpCommunicator._wlQRCodeUrlCallback not set! should never happen');
        }
        this.respondToWlQRCodeUrlRequest();
        break;
      case HostConfigEventType.ClosePopup:
        if (!this._connected) return;
        this.closeChildWindow();
        break;
    }
  }

  selectConnectionType(): Promise<ConnectionType> {
    return new Promise((resolve, reject) => {
      if (!this.peerWindow) {
        reject(new Error('No pop up window found. Make sure to run .connect() before .send()'));
      }

      this.resolveConnectionType = resolve;
      this.postClientConfigMessage(ClientConfigEventType.SelectConnectionType);
    });
  }

  private postClientConfigMessage(type: ClientConfigEventType) {
    const configMessage: ConfigMessage = {
      type: 'config',
      id: crypto.randomUUID(),
      event: {
        type,
      },
    };
    this.postMessage(configMessage);
  }

  // Send message that expect to receive response
  request(message: Message): Promise<Message> {
    return new Promise((resolve, reject) => {
      if (!this.peerWindow) {
        reject(new Error('No pop up window found. Make sure to run .connect() before .send()'));
      }

      this.postMessage(message);

      this.requestResolutions.set(message.id, resolve);
    });
  }

  protected onDisconnect() {
    this.closeChildWindow();
    this.requestResolutions.clear();
  }

  private openFixedSizePopUpWindow() {
    const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
    const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

    const urlParams = new URLSearchParams();
    urlParams.append('opener', encodeURIComponent(window.location.href));

    if (!this.url) {
      throw new Error('No url provided in PopUpCommunicator');
    }
    const popupUrl = new URL(this.url);
    popupUrl.search = urlParams.toString();

    const popupWindow = window.open(
      popupUrl,
      'SCW Child Window',
      `width=${POPUP_WIDTH}, height=${POPUP_HEIGHT}, left=${left}, top=${top}`
    );

    this.peerWindow = popupWindow;
    popupWindow?.focus();
  }

  private closeChildWindow() {
    if (this.peerWindow && !this.peerWindow.closed) {
      this.peerWindow.close();
    }
    this.peerWindow = null;
  }
}
