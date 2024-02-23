import { UUID } from 'crypto';

import {
  ClientConfigEventType,
  ConfigMessage,
  ConnectionType,
  HostConfigEventType,
  isConfigMessage,
} from './ConfigMessage';
import { ConnectionPreference } from ':core/communicator/ConnectionPreference';
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
  // TODO: let's revisit this when we migrate all this to ConnectionConfigurator.
  private wlQRCodeUrlCallback?: () => string;

  constructor({ url }: { url: string }) {
    super();
    this.url = new URL(url);
  }

  // should be set before calling .connect()
  setWLQRCodeUrlCallback(callback: () => string) {
    this.wlQRCodeUrlCallback = callback;
  }

  protected onConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.resolvePopupReady = resolve;
      this.openFixedSizePopUpWindow();

      if (!this.peerWindow) {
        reject(standardErrors.rpc.internal('No pop up window opened'));
      }
    });
  }

  private respondToWlQRCodeUrlRequest() {
    if (!this.wlQRCodeUrlCallback) {
      throw standardErrors.rpc.internal(
        'PopUpCommunicator.wlQRCodeUrlCallback not set! make sure .setWLQRCodeUrlCallback is called first'
      );
    }
    const wlQRCodeUrl = this.wlQRCodeUrlCallback();
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
    const resolveFunction = this.requestMap.get(requestId)?.resolve;
    this.requestMap.delete(requestId);
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
        if (!this.wlQRCodeUrlCallback) {
          throw standardErrors.rpc.internal(
            'PopUpCommunicator.wlQRCodeUrlCallback not set! should never happen'
          );
        }
        this.respondToWlQRCodeUrlRequest();
        break;
      case HostConfigEventType.PopupUnload:
        this.disconnect();
        break;
    }
  }

  selectConnectionType({
    connectionPreference,
  }: {
    connectionPreference: ConnectionPreference;
  }): Promise<ConnectionType> {
    return new Promise((resolve, reject) => {
      if (!this.peerWindow) {
        reject(
          standardErrors.rpc.internal(
            'No pop up window found. Make sure to run .connect() before .send()'
          )
        );
      }

      this.resolveConnectionType = resolve;
      this.postClientConfigMessage(ClientConfigEventType.SelectConnectionType, {
        connectionPreference,
      });
    });
  }

  walletLinkQrScanned() {
    this.postClientConfigMessage(ClientConfigEventType.WalletLinkQrScanned);
  }

  private postClientConfigMessage(type: ClientConfigEventType, options?: any) {
    if (options && type !== ClientConfigEventType.SelectConnectionType) {
      throw standardErrors.rpc.internal('ClientConfigEvent does not accept options');
    }

    const configMessage: ConfigMessage = {
      type: 'config',
      id: crypto.randomUUID(),
      event: {
        type,
        value: options,
      },
    };
    this.postMessage(configMessage);
  }

  // Send message that expect to receive response
  request(message: Message): Promise<Message> {
    return new Promise((resolve, reject) => {
      if (!this.peerWindow) {
        reject(
          standardErrors.rpc.internal(
            'No pop up window found. Make sure to run .connect() before .send()'
          )
        );
      }

      this.postMessage(message);

      const fulfillment: Fulfillment = {
        message,
        resolve,
        reject,
      };
      this.requestMap.set(message.id, fulfillment);
    });
  }

  protected onDisconnect() {
    this._connected = false;
    this.closeChildWindow();
    this.requestMap.forEach((fulfillment, uuid, map) => {
      fulfillment.reject(standardErrors.provider.userRejectedRequest('Request rejected'));
      map.delete(uuid);
    });
  }

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
