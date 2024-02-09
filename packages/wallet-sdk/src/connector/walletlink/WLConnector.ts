import { AddressString } from '../../core/type';
import { ScopedLocalStorage } from '../../lib/ScopedLocalStorage';
import { RequestArguments } from '../../provider/ProviderInterface';
import { WLRelayAdapter, WLRelayUpdateListener } from '../../relay/walletlink/WLRelayAdapter';
import { Chain, Connector, ConnectorUpdateListener } from '../ConnectorInterface';

export class WLConnector implements Connector, WLRelayUpdateListener {
  private updateListener: ConnectorUpdateListener;
  private adapter: WLRelayAdapter;

  constructor(options: { storage: ScopedLocalStorage; updateListener: ConnectorUpdateListener }) {
    this.updateListener = options.updateListener;
    this.adapter = new WLRelayAdapter(options.storage, this);
  }

  async handshake(): Promise<AddressString[]> {
    const accounts = await this.request<AddressString[]>({ method: 'eth_requestAccounts' });
    this.onAccountsChanged(accounts);
    return accounts;
  }

  async request<T>(requestArgs: RequestArguments): Promise<T> {
    return this.adapter.request<T>(requestArgs);
  }

  onAccountsChanged(accounts: AddressString[]) {
    this.updateListener.onAccountsChanged(this, accounts);
  }

  onChainChanged(chain: Chain) {
    this.updateListener.onChainChanged(this, chain);
  }

  getQRCodeUrl(): string {
    return this.adapter.getQRCodeUrl();
  }
}
