import { waitFor } from "@testing-library/preact";

import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK";
import { ScopedLocalStorage } from "./lib/ScopedLocalStorage";
import {
  CoinbaseWalletProvider,
  CoinbaseWalletProviderOptions
} from "./provider/CoinbaseWalletProvider";
import { WalletSDKRelay } from "./relay/WalletSDKRelay";
import { WalletSDKRelayEventManager } from "./relay/WalletSDKRelayEventManager";

jest.mock("./provider/WalletSDKUI");

const mockSetAppInfo = jest.fn();

class MockProviderClass extends CoinbaseWalletProvider {
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

const mockProvider = new MockProviderClass({
  jsonRpcUrl: "jsonrpc-url",
  overrideIsMetaMask: false,
  relayEventManager: new WalletSDKRelayEventManager(),
  relayProvider: jest.fn(),
  storage: new ScopedLocalStorage("-walletlink")
});

describe("CoinbaseWalletSDK", () => {
  describe("initialize", () => {
    test("with defaults", () => {
      const coinbaseWalletSDK1 = new CoinbaseWalletSDK({
        appName: "",
        appLogoUrl: ""
      });

      expect(coinbaseWalletSDK1).toMatchObject({
        _appLogoUrl: null,
        _appName: "DApp",
        _overrideIsMetaMask: false,
        _overrideIsCoinbaseWallet: true
      });
    });
  });

  describe("public methods", () => {
    let coinbaseWalletSDK2: CoinbaseWalletSDK;
    beforeEach(() => {
      coinbaseWalletSDK2 = new CoinbaseWalletSDK({
        appName: "Test",
        appLogoUrl: "http://coinbase.com/wallet-logo.png"
      });
    });

    describe("sdk", () => {
      test("makeWeb3Provider", () => {
        expect(coinbaseWalletSDK2.makeWeb3Provider()).toBeInstanceOf(
          CoinbaseWalletProvider
        );
      });

      test("disconnect", () => {
        const relayResetMock = jest
          .spyOn(WalletSDKRelay.prototype, "resetAndReload")
          .mockImplementation(() => "resetAndReload");
        coinbaseWalletSDK2.disconnect();
        expect(relayResetMock).toHaveBeenCalled();
      });

      test("setAppInfo", () => {
        const relaySetAppInfoMock = jest
          .spyOn(WalletSDKRelay.prototype, "setAppInfo")
          .mockImplementation(() => "setAppInfo");
        coinbaseWalletSDK2.setAppInfo("sdk", "http://sdk-image.png");
        expect(relaySetAppInfoMock).toHaveBeenCalledWith(
          "sdk",
          "http://sdk-image.png"
        );
      });

      test("getQrUrl", () => {
        const qrUrl = coinbaseWalletSDK2.getQrUrl() || "";

        const url = new URL(qrUrl);

        expect(url.hostname).toEqual("www.walletlink.org");
        expect(url.hash.split("=")).toHaveLength(5);
      });
    });

    describe("extension", () => {
      beforeAll(() => {
        // @ts-expect-error mocked provider
        window.coinbaseWalletExtension = mockProvider;
      });

      afterAll(() => {
        window.coinbaseWalletExtension = undefined;
      });

      test("makeWeb3Provider", () => {
        // Returns extension provider
        expect(coinbaseWalletSDK2.makeWeb3Provider()).toEqual(mockProvider);
      });

      test("disconnect", () => {
        // Calls extension close
        coinbaseWalletSDK2.disconnect();
        expect(mockProvider.close()).toEqual("mockClose");
      });

      test("setAppInfo", async () => {
        coinbaseWalletSDK2.setAppInfo("extension", "http://extension-logo.png");

        await waitFor(() => {
          expect(mockSetAppInfo).toBeCalledWith(
            "extension",
            "http://extension-logo.png"
          );
        });
      });
    });
  });
});
