import { Signer, StateUpdateListener } from '../interface';
import { AppMetadata, ProviderInterface, RequestArguments } from ':core/provider/interface';
import { AddressString, HexString } from ':core/type';
import { intNumberFromHexString } from ':core/type/util';

interface CBExtensionInjectedProvider extends ProviderInterface {
  send: (...args: unknown[]) => unknown; // _handleSynchronousMethods
  setAppInfo?: (...args: unknown[]) => unknown;
}

export class ExtensionSigner implements Signer {
  private readonly metadata: AppMetadata;
  private readonly updateListener: StateUpdateListener;
  private extensionProvider: CBExtensionInjectedProvider;

  constructor(params: { metadata: AppMetadata; updateListener: StateUpdateListener }) {
    this.metadata = params.metadata;
    this.updateListener = params.updateListener;
    const extensionProvider = (
      globalThis as { coinbaseWalletExtension?: CBExtensionInjectedProvider }
    ).coinbaseWalletExtension;

    if (!extensionProvider) {
      throw new Error('Coinbase Wallet extension not found');
    }

    const { appName, appLogoUrl, appChainIds } = this.metadata;
    extensionProvider.setAppInfo?.(appName, appLogoUrl, appChainIds);
    this.extensionProvider = extensionProvider;

    this.extensionProvider.on('chainChanged', (chainId) => {
      this.updateListener.onChainIdUpdate(Number(chainId));
    });

    this.extensionProvider.on('accountsChanged', (accounts) =>
      this.updateListener.onAccountsUpdate(accounts as AddressString[])
    );
  }

  get accounts() {
    return this.extensionProvider.send({ method: 'eth_accounts' }) as AddressString[];
  }

  get chain() {
    const hexString = this.extensionProvider.send({ method: 'eth_chainId' }) as HexString;
    // TODO: currently, provider expects `rpcUrl` for fetch requests
    return { id: intNumberFromHexString(hexString) };
  }

  async handshake(): Promise<AddressString[]> {
    const accounts = await this.request<AddressString[]>({
      method: 'eth_requestAccounts',
    });
    this.updateListener.onAccountsUpdate(accounts);
    return accounts;
  }

  async request<T>(request: RequestArguments): Promise<T> {
    return await this.extensionProvider.request(request);
  }

  async disconnect() {
    await this.extensionProvider?.disconnect();
  }
}
