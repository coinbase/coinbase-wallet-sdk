import { Signer, StateUpdateListener } from '../interface';
import { WLRelayAdapter } from './relay/WLRelayAdapter';
import { PopupCommunicator } from ':core/communicator/Communicator';
import { WALLETLINK_URL } from ':core/constants';
import { ConfigMessage } from ':core/message';
import { AppMetadata, RequestArguments } from ':core/provider/interface';
import { AddressString } from ':core/type';

export class WLSigner implements Signer {
  private readonly postMessageToPopup: PopupCommunicator['postMessage'];
  private readonly adapter: WLRelayAdapter;

  constructor(params: {
    metadata: AppMetadata;
    postMessageToPopup: PopupCommunicator['postMessage'];
    updateListener?: StateUpdateListener;
  }) {
    const { appName, appLogoUrl } = params.metadata;
    this.postMessageToPopup = params.postMessageToPopup;
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
    const update: ConfigMessage = {
      event: 'WalletLinkUpdate',
      data,
    };
    this.postMessageToPopup(update);
  }

  async disconnect() {
    await this.adapter.close();
  }
}
