import { ScopedLocalStorage } from "../lib/ScopedLocalStorage";
import {
  CoinbaseWalletProvider,
  CoinbaseWalletProviderOptions
} from "../provider/CoinbaseWalletProvider";
import { WalletSDKRelayEventManager } from "../relay/WalletSDKRelayEventManager";

export const mockSetAppInfo = jest.fn();

export class MockProviderClass extends CoinbaseWalletProvider {
  constructor(opts: Readonly<CoinbaseWalletProviderOptions>) {
    super(opts);
  }

  public close() {
    return "mockClose";
  }

  // @ts-expect-error mock relay
  private async initializeRelay() {
    const relay = {
      setAppInfo: mockSetAppInfo
    };
    await Promise.resolve();
    return relay;
  }
}

export const mockExtensionProvider = new MockProviderClass({
  jsonRpcUrl: "jsonrpc-url",
  overrideIsMetaMask: false,
  relayEventManager: new WalletSDKRelayEventManager(),
  relayProvider: jest.fn(),
  storage: new ScopedLocalStorage("-walletlink")
});
