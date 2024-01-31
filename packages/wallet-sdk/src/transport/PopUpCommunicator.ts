import { UUID } from 'crypto';

import {
  ClientConfigEventType,
  ConfigMessage,
  ConnectionType,
  HostConfigEventType,
  isConfigMessage,
} from './ConfigMessage';
import { CrossDomainCommunicator, Message } from './CrossDomainCommunicator';
import { SCWRequestMessage, SCWResponseMessage } from './SCWMessage';

// TODO: how to set/change configurations?
const POPUP_WIDTH = 688;
const POPUP_HEIGHT = 621;

export class PopUpCommunicator extends CrossDomainCommunicator {
  private requestResolutions = new Map<UUID, (_: Message) => void>();

  constructor({ url }: { url: string }) {
    super();
    this.url = new URL(url);
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

  protected onEvent(event: MessageEvent<Message>) {
    if (event.origin !== this.url?.origin) return;
    if (!this._connected) return;

    const message = event.data;

    if (isConfigMessage(message)) {
      this.handleConfigMessage(message);
      return;
    }

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
        this.postClientConfigMessage(ClientConfigEventType.DappOriginMessage);
        break;
      case HostConfigEventType.PopupReadyForRequest:
        this.resolvePopupReady?.();
        this.resolvePopupReady = undefined;
        break;
      case HostConfigEventType.ConnectionTypeSelected:
        this.resolveConnectionType?.(message.event.value as ConnectionType);
        this.resolveConnectionType = undefined;
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

  request<T>(request: SCWRequestMessage['content']): Promise<SCWResponseMessage<T>> {
    return new Promise((resolve, reject) => {
      if (!this.peerWindow) {
        reject(new Error('No pop up window found. Make sure to run .connect() before .send()'));
      }

      const requestMessage: SCWRequestMessage = {
        type: 'web3Request',
        id: crypto.randomUUID(),
        content: request,
        timestamp: new Date(),
      };

      const requestId = this.postMessage(requestMessage);

      this.requestResolutions.set(requestId, (resEnv) => {
        resolve(resEnv as SCWResponseMessage<T>);
      });
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
