import { ScopedLocalStorage } from "../lib/ScopedLocalStorage";
import {
  CoinbaseWalletProvider,
  CoinbaseWalletProviderOptions,
} from "../provider/CoinbaseWalletProvider";
import { WalletSDKRelayEventManager } from "../relay/WalletSDKRelayEventManager";

export const mockSetAppInfo = jest.fn();

export class MockProviderClass extends CoinbaseWalletProvider {
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

export const mockExtensionProvider = new MockProviderClass({
  chainId: 1,
  jsonRpcUrl: "jsonrpc-url",
  overrideIsMetaMask: false,
  relayEventManager: new WalletSDKRelayEventManager(),
  relayProvider: jest.fn(),
  storage: new ScopedLocalStorage("-walletlink"),
});
