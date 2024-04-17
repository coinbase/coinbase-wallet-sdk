import { UUID } from 'crypto';

import { LIB_VERSION } from '../../version';
import { CrossDomainCommunicator } from './CrossDomainCommunicator';
import { standardErrors } from ':core/error';
import { Message } from ':core/message';
import {
  ConfigEventType,
  ConfigRequestMessage,
  PopupSetupEventType,
  SignerConfigEventType,
  SignerType,
  WalletLinkConfigEventType,
} from ':core/message/ConfigMessage';

// TODO: how to set/change configurations?
const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;

type Fulfillment = {
  resolve: (_: Message) => void;
  reject: (_: Error) => void;
};

export class PopUpCommunicator extends CrossDomainCommunicator {
  private requestMap = new Map<UUID, Fulfillment>();

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

    const configMessage: ConfigRequestMessage = {
      type: 'config',
      id: crypto.randomUUID(),
      event: type,
      params: options,
      version: LIB_VERSION,
    };
    this.postMessage(configMessage);
  }

  protected async onConnect() {
    this.openFixedSizePopUpWindow();
    await this.waitForPopupHello();
  }

  protected onEvent(event: MessageEvent<Message>) {
    if (event.origin !== this.url?.origin) return;

    const message = event.data;
    if (!('requestId' in message)) {
      this.handleIncomingRequest(message as ConfigRequestMessage);
      return;
    }

    const requestId = message.requestId as UUID;
    const resolveFunction = this.requestMap.get(requestId)?.resolve;
    this.requestMap.delete(requestId);
    resolveFunction?.(message);
  }

  protected onDisconnect() {
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

  private handleIncomingRequest(message: ConfigRequestMessage) {
    switch (message.event) {
      case PopupSetupEventType.PopupHello:
        // Handshake Step 2: After receiving PopupHello from popup, Dapp sends DappHello
        // to FE to help FE confirm the origin of the Dapp, as well as SDK version.
        this.postConfigMessage(PopupSetupEventType.DappHello, LIB_VERSION);
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
