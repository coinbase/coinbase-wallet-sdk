import { Signer, SignerUpdateListener } from '../SignerInterface';
import { StateUpdateListener } from '../UpdateListenerInterface';
import { AddressString } from ':core/type';
import { ProviderInterface, RequestArguments } from ':core/type/ProviderInterface';

export class ExtSigner implements Signer {
  private adapter: ProviderInterface | undefined;
  private updateListener: StateUpdateListener;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    updateListener: SignerUpdateListener;
  }) {
    this.updateListener = {
      onAccountsUpdate: (...args) => options.updateListener.onAccountsUpdate(this, ...args),
      onChainUpdate: (...args) => options.updateListener.onChainUpdate(this, ...args),
    };
    this.adapter = window.coinbaseWalletExtension;
  }

  async handshake(): Promise<AddressString[]> {
    const newAddresses = await this.request<AddressString[]>({ method: 'eth_requestAccounts' });
    this.updateListener.onAccountsUpdate({
      accounts: newAddresses,
      source: 'wallet',
    });
    return newAddresses;
  }

  async request<T>(requestArgs: RequestArguments): Promise<T> {
    if (!this.adapter) {
      throw new Error('Coinbase Wallet extension not found');
    }
    return this.adapter.request<T>(requestArgs);
  }

  async disconnect() {}
}
