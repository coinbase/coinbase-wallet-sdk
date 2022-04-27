/* eslint-disable max-classes-per-file */
import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK";
import { ScopedLocalStorage } from "./lib/ScopedLocalStorage";
import { Session } from "./relay/Session";
import { WalletSDKRelayOptions } from "./relay/WalletSDKRelay";
import { WalletSDKRelayEventManager } from "./relay/WalletSDKRelayEventManager";

jest.mock("./provider/WalletSDKUI", () => class MockWalletSDKUI {});

jest.mock(
  "./relay/WalletSDKRelay",
  () =>
    class MockWalletSDKRelay {
      private readonly linkAPIUrl: string;
      protected readonly storage: ScopedLocalStorage;
      private readonly _session: Session;
      uiConstructor: () => jest.Mock;
      private readonly relayEventManager: WalletSDKRelayEventManager;
      protected readonly eventListener?: EventListener;
      constructor(options) {
        this.linkAPIUrl = options.linkAPIUrl;
        this.version = options.version;
        this.darkMode = options.darkMode;
        this.storage = options.storage;
        this.relayEventManager = options.relayEventManager;
        this.uiConstructor = options.uiConstructor;
        this.eventListener = options.eventListener;
      }
    }
);

describe("CoinbaseWalletSDK", () => {
  test("initializes", () => {
    const cbWallet = new CoinbaseWalletSDK({
      appName: "Test",
      appLogoUrl: ""
    });

    expect(cbWallet).toHaveBeenCalledTimes(1);
  });
});
