import { UUID } from 'crypto';

import { LIB_VERSION } from '../../../version';
import { CrossDomainCommunicator } from ':core/communicator/CrossDomainCommunicator';
import { standardErrors } from ':core/error';
import { Message } from ':core/message';
import {
  ConfigEventType,
  ConfigMessage,
  isConfigMessage,
  PopupSetupEventType,
  SignerConfigEventType,
  SignerType,
  WalletLinkConfigEventType,
} from ':core/message/ConfigMessage';

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
  private resolveConnection?: () => void;

  private selectSignerTypeFulfillment?: {
    resolve: (_: SignerType) => void;
    reject: (_: Error) => void;
  };

  constructor({ url }: { url: string }) {
    super();
    this.url = new URL(url);
  }

  selectSignerType(smartWalletOnly: boolean): Promise<SignerType> {
    return new Promise((resolve, reject) => {
      this.selectSignerTypeFulfillment = { resolve, reject };
      this.postConfigMessage(SignerConfigEventType.DappSelectSignerType, {
        smartWalletOnly,
      });
    });
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

  postConfigMessage(type: ConfigEventType, options?: unknown) {
    if (
      options &&
      type !== PopupSetupEventType.DappHello &&
      type !== SignerConfigEventType.DappSelectSignerType &&
      type !== WalletLinkConfigEventType.DappWalletLinkUrlResponse
    ) {
      throw standardErrors.rpc.internal('ClientConfigEvent does not accept options');
    }

    const configMessage: ConfigMessage = {
      type: 'config',
      id: crypto.randomUUID(),
      event: type,
      params: options,
      version: LIB_VERSION,
    };
    this.postMessage(configMessage);
  }

  protected onConnect(): Promise<void> {
    return new Promise((resolve) => {
      this.resolveConnection = () => {
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
      this.handleConfigMessage(message);
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
    this.resolveConnection = undefined;
    this.closeChildWindow();
    this.selectSignerTypeFulfillment?.reject(
      standardErrors.provider.userRejectedRequest('Request rejected')
    );
    this.selectSignerTypeFulfillment = undefined;
    this.requestMap.forEach((fulfillment, uuid, map) => {
      fulfillment.reject(standardErrors.provider.userRejectedRequest('Request rejected'));
      map.delete(uuid);
    });
  }

  private handleConfigMessage(message: ConfigMessage) {
    switch (message.event) {
      case PopupSetupEventType.PopupHello:
        // Handshake Step 2: After receiving PopupHello from popup, Dapp sends DappHello
        // to FE to help FE confirm the origin of the Dapp, as well as SDK version.
        this.postConfigMessage(PopupSetupEventType.DappHello, LIB_VERSION);
        this.resolveConnection?.();
        this.resolveConnection = undefined;
        break;
      case SignerConfigEventType.PopupSignerTypeSelected:
        this.selectSignerTypeFulfillment?.resolve(message.params as SignerType);
        break;
      case PopupSetupEventType.PopupUnload:
        this.disconnect();
        break;
    }
  }

  // Window Management

  private openFixedSizePopUpWindow(params?: Record<string, unknown>) {
    const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
    const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

    const urlParams = new URLSearchParams();
    // urlParams.append('opener', encodeURIComponent(window.location.href));
    Object.entries(params || {}).forEach(([key, value]) => {
      urlParams.append(key, encodeURIComponent(JSON.stringify(value)));
    });

    if (!this.url) {
      throw standardErrors.rpc.internal('No url provided in PopUpCommunicator');
    }
    const popupUrl = new URL(this.url);
    popupUrl.search = urlParams.toString();

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
