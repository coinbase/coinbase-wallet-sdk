import { Signer, StateUpdateListener } from '../interface';
import { WLRelayAdapter } from './relay/WLRelayAdapter';
import { Communicator } from ':core/communicator/Communicator';
import { WALLETLINK_URL } from ':core/constants';
import { AppMetadata, RequestArguments } from ':core/provider/interface';
import { AddressString } from ':core/type';

export class WLSigner implements Signer {
  private readonly adapter: WLRelayAdapter;

  constructor(params: {
    metadata: AppMetadata;
    postMessageToPopup: Communicator['postMessage'];
    updateListener?: StateUpdateListener;
  }) {
    const { appName, appLogoUrl } = params.metadata;
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

  getSession() {
    const { id, secret } = this.adapter.getWalletLinkSession();
    return { id, secret };
  }

  async disconnect() {
    await this.adapter.close();
  }
}
