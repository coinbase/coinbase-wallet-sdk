import {
  ClientConfigEventType,
  ConfigMessage,
  HostConfigEventType,
  SignerType,
} from './ConfigMessage';
import { PopUpCommunicator } from './PopUpCommunicator';
import { standardErrors } from ':core/error';

export class PopUpConfigurator {
  private communicator: PopUpCommunicator;

  getWalletLinkQRCodeUrlCallback?: () => string;
  resolvePopupConnection?: () => void;
  resolveSignerTypeSelection?: (_: SignerType) => void;

  constructor({ communicator }: { communicator: PopUpCommunicator }) {
    this.communicator = communicator;
  }

  handleConfigMessage(message: ConfigMessage) {
    switch (message.event.type) {
      case HostConfigEventType.PopupListenerAdded:
        // Handshake Step 2: After receiving POPUP_LISTENER_ADDED_MESSAGE from Dapp,
        // Dapp sends DAPP_ORIGIN_MESSAGE to FE to help FE confirm the origin of the Dapp
        this.postClientConfigMessage(ClientConfigEventType.DappOriginMessage);
        break;
      case HostConfigEventType.PopupReadyForRequest:
        // Handshake Step 4: After receiving POPUP_READY_MESSAGE from Dapp, FE knows that
        // Dapp is ready to receive requests, handshake is done
        this.resolvePopupConnection?.();
        this.resolvePopupConnection = undefined;
        break;
      case HostConfigEventType.ConnectionTypeSelected:
        if (!this.communicator.connected) return;
        this.resolveSignerTypeSelection?.(message.event.value as SignerType);
        this.resolveSignerTypeSelection = undefined;
        break;
      case HostConfigEventType.RequestWalletLinkUrl:
        if (!this.communicator.connected) return;
        if (!this.getWalletLinkQRCodeUrlCallback) {
          throw standardErrors.rpc.internal('getWalletLinkQRCodeUrlCallback not set');
        }
        this.respondToWlQRCodeUrlRequest();
        break;
      case HostConfigEventType.PopupUnload:
        this.communicator.disconnect();
        break;
    }
  }

  postClientConfigMessage(type: ClientConfigEventType, options?: any) {
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
    this.communicator.postMessage(configMessage);
  }

  onDisconnect() {
    this.resolvePopupConnection = undefined;
    this.resolveSignerTypeSelection = undefined;
  }

  private respondToWlQRCodeUrlRequest() {
    if (!this.getWalletLinkQRCodeUrlCallback) {
      throw standardErrors.rpc.internal('PopUpCommunicator.getWalletLinkQRCodeUrlCallback not set');
    }
    const walletLinkQRCodeUrl = this.getWalletLinkQRCodeUrlCallback();
    const configMessage: ConfigMessage = {
      type: 'config',
      id: crypto.randomUUID(),
      event: {
        type: ClientConfigEventType.WalletLinkUrl,
        value: walletLinkQRCodeUrl,
      },
    };
    this.communicator.postMessage(configMessage);
  }
}
