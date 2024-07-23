import { Signer, SignerUpdateCallback } from '../interface';
import {
  AppMetadata,
  ProviderEventKey,
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
  private readonly callback: SignerUpdateCallback;
  private extensionProvider: CBExtensionInjectedProvider;

  constructor(params: { metadata: AppMetadata; callback: SignerUpdateCallback }) {
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

    const events: ProviderEventKey[] = ['chainChanged', 'accountsChanged'];
    events.forEach((event) =>
      this.extensionProvider.on(event, (data) => this.callback(event, data))
    );
  }

  get accounts() {
    return this.extensionProvider.send({ method: 'eth_accounts' }) as AddressString[];
  }

  get chainId() {
    const hexString = this.extensionProvider.send({ method: 'eth_chainId' }) as HexString;
    return intNumberFromHexString(hexString);
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
