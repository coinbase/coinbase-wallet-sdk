import { Signer } from '../interface';
import {
  AppMetadata,
  ProviderEventCallback,
  ProviderInterface,
  RequestArguments,
} from ':core/provider/interface';
import { AddressString, HexString } from ':core/type';
import { intNumberFromHexString } from ':core/type/util';

interface CBExtensionInjectedProvider extends ProviderInterface {
  send: (...args: unknown[]) => unknown; // _handleSynchronousMethods
  setAppInfo?: (...args: unknown[]) => unknown;
}

export class ExtensionSigner implements Signer {
  private readonly metadata: AppMetadata;
  private readonly callback: ProviderEventCallback;
  private extensionProvider: CBExtensionInjectedProvider;

  constructor(params: { metadata: AppMetadata; callback: ProviderEventCallback }) {
    this.metadata = params.metadata;
    this.callback = params.callback;
    const extensionProvider = (
      globalThis as { coinbaseWalletExtension?: CBExtensionInjectedProvider }
    ).coinbaseWalletExtension;

    if (!extensionProvider) {
      throw new Error('Coinbase Wallet extension not found');
    }

    const { appName, appLogoUrl, appChainIds } = this.metadata;
    extensionProvider.setAppInfo?.(appName, appLogoUrl, appChainIds);
    this.extensionProvider = extensionProvider;

    const events: Parameters<ProviderEventCallback>[0][] = [
      'connect',
      'chainChanged',
      'accountsChanged',
      'disconnect',
    ];
    events.forEach((event) =>
      this.extensionProvider.on(event, (data) => this.callback(event, data))
    );
  }

  get accounts() {
    return (async () => {
      return (await this.extensionProvider.request({
        method: 'eth_accounts',
      })) as AddressString[];
    })();
  }

  get chainId() {
    return (async () => {
      const hexString = (await this.extensionProvider.request({
        method: 'eth_chainId',
      })) as HexString;
      return intNumberFromHexString(hexString) as number;
    })();
  }

  async handshake() {
    await this.request({
      method: 'eth_requestAccounts',
    });
  }

  async request(request: RequestArguments) {
    return await this.extensionProvider.request(request);
  }

  async disconnect() {
    await this.extensionProvider?.disconnect();
  }
}
