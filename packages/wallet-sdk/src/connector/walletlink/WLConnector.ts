import { AddressString } from '../../core/type';
import { ScopedLocalStorage } from '../../lib/ScopedLocalStorage';
import { RequestArguments } from '../../provider/ProviderInterface';
import { WLRelayAdapter } from '../../relay/walletlink/WLRelayAdapter';
import { Connector, ConnectorUpdateListener } from '../ConnectorInterface';

export class WLConnector implements Connector {
  private updateListener: ConnectorUpdateListener;
  private adapter: WLRelayAdapter;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    storage: ScopedLocalStorage;
    updateListener: ConnectorUpdateListener;
  }) {
    this.updateListener = options.updateListener;
    this.adapter = new WLRelayAdapter({
      ...options,
      updateListener: {
        onAccountsChanged: (...args) => this.updateListener.onAccountsChanged(this, ...args),
        onChainChanged: (...args) => this.updateListener.onChainChanged(this, ...args),
      },
    });
  }

  async handshake(): Promise<AddressString[]> {
    const accounts = await this.request<AddressString[]>({ method: 'eth_requestAccounts' });
    this.updateListener.onAccountsChanged(this, accounts);
    return accounts;
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
