import { Signer, StateUpdateListener } from '../interface';
import { WLRelayAdapter } from './relay/WLRelayAdapter';
import { PopUpCommunicator } from ':core/communicator/PopUpCommunicator';
import { WALLETLINK_URL } from ':core/constants';
import { ConfigEvent, ConfigUpdateMessage } from ':core/message/ConfigMessage';
import { AppMetadata, RequestArguments } from ':core/provider/interface';
import { AddressString } from ':core/type';

export class WLSigner implements Signer {
  private popupCommunicator: PopUpCommunicator;
  private adapter: WLRelayAdapter;

  constructor(params: {
    metadata: AppMetadata;
    popupCommunicator: PopUpCommunicator;
    updateListener: StateUpdateListener;
  }) {
    const { appName, appLogoUrl } = params.metadata;
    this.popupCommunicator = params.popupCommunicator;
    this.adapter = new WLRelayAdapter({
      appName,
      appLogoUrl,
      walletlinkUrl: WALLETLINK_URL,
      updateListener: params.updateListener,
    });
  }

  async handshake(): Promise<AddressString[]> {
    const ethAddresses = await this.request<AddressString[]>({ method: 'eth_requestAccounts' });
    return ethAddresses;
  }

  async request<T>(requestArgs: RequestArguments): Promise<T> {
    return this.adapter.request<T>(requestArgs);
  }

  async handleWalletLinkSessionRequest() {
    this.postWalletLinkSession();

    // Wait for the wallet link session to be established
    await this.handshake();
    this.postWalletLinkConnected();
  }

  private postWalletLinkSession() {
    const { id, secret } = this.adapter.getWalletLinkSession();
    this.postWalletLinkUpdate({ session: { id, secret } });
  }

  private postWalletLinkConnected() {
    this.postWalletLinkUpdate({ connected: true });
  }

  private postWalletLinkUpdate(data: unknown) {
    this.popupCommunicator.postMessage<ConfigUpdateMessage>({
      event: ConfigEvent.WalletLinkUpdate,
      data,
    });
  }

  async disconnect() {
    await this.adapter.close();
  }
}
