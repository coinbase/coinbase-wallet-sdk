import { StateUpdateListener } from '../interface';
import { AppMetadata, RequestArguments, Signer } from ':core/provider/interface';
import { AddressString } from ':core/type';
import { CBInjectedProvider, CBWindow } from ':util/provider';

export class ExtensionSigner implements Signer {
  private readonly metadata: AppMetadata;
  private readonly updateListener: StateUpdateListener;
  private extensionProvider: CBInjectedProvider | undefined;

  constructor(params: { metadata: AppMetadata; updateListener: StateUpdateListener }) {
    this.metadata = params.metadata;
    this.updateListener = params.updateListener;
    const extensionProvider = this.getCbInjectedExtensionProvider();

    if (extensionProvider) {
      const { appName, appLogoUrl, appChainIds } = this.metadata;
      extensionProvider.setAppInfo?.(appName, appLogoUrl, appChainIds);
      this.extensionProvider = extensionProvider;

      this.extensionProvider.on('chainChanged', (chainId) => {
        this.updateListener.onChainUpdate({ chain: { id: Number(chainId) }, source: 'wallet' });
      });

      this.extensionProvider.on('accountsChanged', (accounts) =>
        this.updateListener.onAccountsUpdate({
          accounts: accounts as AddressString[],
          source: 'wallet',
        })
      );
    } else {
      // should never happen since SCW FE should not show extension connection type in this case
      throw new Error('Coinbase Wallet extension not found');
    }
  }

  private getCbInjectedExtensionProvider(): CBInjectedProvider | undefined {
    const window = globalThis as CBWindow;
    return window.coinbaseWalletExtension;
  }

  async handshake(): Promise<AddressString[]> {
    if (!this.extensionProvider) {
      throw new Error('Coinbase Wallet extension not found');
    }
    const accounts = await this.request<AddressString[]>({
      method: 'eth_requestAccounts',
    });

    if (accounts) {
      this.updateListener.onAccountsUpdate({ accounts, source: 'wallet' });
      return accounts;
    }
    throw new Error('No account found');
  }

  async request<T>(request: RequestArguments): Promise<T> {
    if (!this.extensionProvider) {
      throw new Error('Coinbase Wallet extension not found');
    }
    return this.extensionProvider.request(request);
  }

  async disconnect() {
    await this.extensionProvider?.disconnect();
  }
}
