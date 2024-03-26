import { Signer, SignerUpdateListener } from '../SignerInterface';
import { WLRelayAdapter } from './relay/WLRelayAdapter';
import { WALLETLINK_URL } from ':core/constants';
import { AddressString } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';

export class WLSigner implements Signer {
  private adapter: WLRelayAdapter;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    updateListener: SignerUpdateListener;
  }) {
    this.adapter = new WLRelayAdapter({
      ...options,
      walletlinkUrl: WALLETLINK_URL,
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
