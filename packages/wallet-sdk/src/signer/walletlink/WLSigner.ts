import { LINK_API_URL } from '../../core/constants';
import { AddressString } from '../../core/type';
import { RequestArguments } from '../../provider/ProviderInterface';
import { WLRelayAdapter } from '../../relay/walletlink/WLRelayAdapter';
import { Signer, SignerUpdateListener } from '../SignerInterface';

export class WLSigner implements Signer {
  private adapter: WLRelayAdapter;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    updateListener: SignerUpdateListener;
  }) {
    this.adapter = new WLRelayAdapter({
      ...options,
      walletlinkUrl: LINK_API_URL,
      updateListener: {
        onAccountsUpdate: (...args) => options.updateListener.onAccountsUpdate(this, ...args),
        onChainUpdate: (...args) => options.updateListener.onChainUpdate(this, ...args),
      },
    });
  }

  async handshake(): Promise<AddressString[]> {
    return await this.request<AddressString[]>({ method: 'eth_requestAccounts' });
  }

  async request<T>(requestArgs: RequestArguments): Promise<T> {
    return this.adapter.request<T>(requestArgs);
  }

  getQRCodeUrl(): string {
    return this.adapter.getQRCodeUrl();
  }

  async disconnect() {
    await this.adapter.close();
  }
}
