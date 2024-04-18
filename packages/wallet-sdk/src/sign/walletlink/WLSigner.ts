import { Signer } from '../SignerInterface';
import { StateUpdateListener } from '../UpdateListenerInterface';
import { WLRelayAdapter } from './relay/WLRelayAdapter';
import { WALLETLINK_URL } from ':core/constants';
import { AddressString } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';

export class WLSigner implements Signer {
  private adapter: WLRelayAdapter;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    updateListener: StateUpdateListener;
  }) {
    this.adapter = new WLRelayAdapter({
      ...options,
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
    const session = this.adapter.getWalletLinkSession();
    return {
      id: session.id,
      secret: session.secret,
    };
  }

  async disconnect() {
    await this.adapter.close();
  }
}
