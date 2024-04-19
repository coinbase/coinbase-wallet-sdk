import { StateUpdateListener } from '../interface';
import { Signer } from '../SignerInterface';
import { WLRelayAdapter } from './relay/WLRelayAdapter';
import { WALLETLINK_URL } from ':core/constants';
import { AddressString } from ':core/type';
import { AppMetadata, RequestArguments } from ':core/type/ProviderInterface';

export class WLSigner implements Signer {
  private adapter: WLRelayAdapter;

  constructor(options: { metadata: AppMetadata; updateListener: StateUpdateListener }) {
    const { appName, appLogoUrl } = options.metadata;
    this.adapter = new WLRelayAdapter({
      appName,
      appLogoUrl,
      walletlinkUrl: WALLETLINK_URL,
      updateListener: options.updateListener,
    });
  }

  async handshake(): Promise<AddressString[]> {
    return await this.request<AddressString[]>({ method: 'eth_requestAccounts' });
  }

  async request<T>(requestArgs: RequestArguments): Promise<T> {
    return this.adapter.request<T>(requestArgs);
  }

  getWalletLinkSession() {
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
