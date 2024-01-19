import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import {
  CoinbaseWalletProvider,
  CoinbaseWalletProviderOptions,
} from '../provider/CoinbaseWalletProvider';
import { EIP1193Provider, EIP1193ProviderOptions } from '../provider/EIP1193Provider';
import { RelayEventManager } from '../relay/RelayEventManager';

export const mockSetAppInfo = jest.fn();

export class MockProviderClass extends CoinbaseWalletProvider {
  // eslint-disable-next-line no-useless-constructor
  constructor(opts: Readonly<CoinbaseWalletProviderOptions>) {
    super(opts);
  }

  public async close() {
    return Promise.resolve();
  }

  // @ts-expect-error mock relay
  private async initializeRelay() {
    return Promise.resolve({
      setAppInfo: mockSetAppInfo,
    });
  }
}

export class MockEIP1193ProviderClass extends EIP1193Provider {
  constructor(opts: Readonly<EIP1193ProviderOptions>) {
    super(opts);
  }
}

export const mockExtensionProvider = new MockProviderClass({
  chainId: 1,
  jsonRpcUrl: 'jsonrpc-url',
  overrideIsMetaMask: false,
  relayEventManager: new RelayEventManager(),
  relayProvider: jest.fn(),
  storage: new ScopedLocalStorage('-walletlink'),
});
