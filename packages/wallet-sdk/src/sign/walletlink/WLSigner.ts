import { Signer, StateUpdateListener } from '../interface';
import { WLRelayAdapter } from './relay/WLRelayAdapter';
import { PopUpCommunicator } from ':core/communicator/PopUpCommunicator';
import { WALLETLINK_URL } from ':core/constants';
import { ConfigEvent, ConfigUpdateMessage } from ':core/message/ConfigMessage';
import { AddressString } from ':core/type';
import { AppMetadata, RequestArguments } from ':core/type/ProviderInterface';

export class WLSigner implements Signer {
  private popupCommunicator: PopUpCommunicator;
  private adapter: WLRelayAdapter;

  constructor(options: {
    metadata: AppMetadata;
    popupCommunicator: PopUpCommunicator;
    updateListener: StateUpdateListener;
  }) {
    const { appName, appLogoUrl } = options.metadata;
    this.popupCommunicator = options.popupCommunicator;
    this.adapter = new WLRelayAdapter({
      appName,
      appLogoUrl,
      walletlinkUrl: WALLETLINK_URL,
      updateListener: options.updateListener,
    });
  }

  async handshake(): Promise<AddressString[]> {
    const ethAddresses = await this.request<AddressString[]>({ method: 'eth_requestAccounts' });
    this.onConnect();
    return ethAddresses;
  }

  private onConnect() {
    this.popupCommunicator.postMessage<ConfigUpdateMessage>({
      event: ConfigEvent.WalletLinkUpdate,
      data: {
        connected: true,
      },
    });
  }

  async request<T>(requestArgs: RequestArguments): Promise<T> {
    return this.adapter.request<T>(requestArgs);
  }

  private getWalletLinkSession() {
    const { id, secret } = this.adapter.getWalletLinkSession();
    return {
      id,
      secret,
    };
  }

  async disconnect() {
    await this.adapter.close();
  }
}
