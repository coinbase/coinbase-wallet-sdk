// eslint-disable-next-line max-classes-per-file
import { waitFor } from "@testing-library/preact";

import {
  mockExtensionProvider,
  MockProviderClass,
  mockSetAppInfo,
} from "./__mocks__/provider";
import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK";
import { ScopedLocalStorage } from "./lib/ScopedLocalStorage";
import {
  CoinbaseWalletProvider,
  CoinbaseWalletProviderOptions,
} from "./provider/CoinbaseWalletProvider";
import { WalletSDKRelay } from "./relay/WalletSDKRelay";
import { WalletSDKRelayEventManager } from "./relay/WalletSDKRelayEventManager";

jest.mock("./provider/WalletSDKUI");

describe("CoinbaseWalletSDK", () => {
  describe("initialize", () => {
    test("with defaults", () => {
      const coinbaseWalletSDK1 = new CoinbaseWalletSDK({
        appName: "",
        appLogoUrl: "",
      });

      expect(coinbaseWalletSDK1).toMatchObject({
        _appLogoUrl: null,
        _appName: "DApp",
        _overrideIsMetaMask: false,
        _overrideIsCoinbaseWallet: true,
      });
    });
  });

  describe("public methods", () => {
    let coinbaseWalletSDK2: CoinbaseWalletSDK;
    beforeEach(() => {
      coinbaseWalletSDK2 = new CoinbaseWalletSDK({
        appName: "Test",
        appLogoUrl: "http://coinbase.com/wallet-logo.png",
      });
    });

    describe("sdk", () => {
      test("@makeWeb3Provider", () => {
        expect(coinbaseWalletSDK2.makeWeb3Provider()).toBeInstanceOf(
          CoinbaseWalletProvider,
        );
      });

      test("@disconnect", () => {
        const relayResetMock = jest
          .spyOn(WalletSDKRelay.prototype, "resetAndReload")
          .mockImplementation(() => "resetAndReload");
        coinbaseWalletSDK2.disconnect();

        expect(relayResetMock).toHaveBeenCalled();
      });

      test("@setAppInfo", () => {
        const relaySetAppInfoMock = jest
          .spyOn(WalletSDKRelay.prototype, "setAppInfo")
          .mockImplementation(() => "setAppInfo");
        coinbaseWalletSDK2.setAppInfo("sdk", "http://sdk-image.png");

        expect(relaySetAppInfoMock).toHaveBeenCalledWith(
          "sdk",
          "http://sdk-image.png",
        );
      });

      test("@getQrUrl", () => {
        const qrUrl = coinbaseWalletSDK2.getQrUrl() || "";
        const url = new URL(qrUrl);

        expect(url.hostname).toEqual("www.walletlink.org");
        expect(url.hash.split("=")).toHaveLength(6);
      });

      test("@getCoinbaseWalletLogo", () => {
        let svgUri;

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo("standard");
        expect(svgUri).toContain("viewBox='0 0 1024 1024'");

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo("circle");
        expect(svgUri).toContain("viewBox='0 0 999.81 999.81'");

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo("text");
        expect(svgUri).toContain("viewBox='0 0 528.15 53.64'");
        expect(svgUri).toContain("fill:%230052ff");

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo("textWithLogo");
        expect(svgUri).toContain("viewBox='0 0 308.44 77.61'");
        expect(svgUri).toContain("fill:%230052ff");

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo("textLight");
        expect(svgUri).toContain("viewBox='0 0 528.15 53.64'");
        expect(svgUri).toContain("fill:%23fefefe");

        svgUri = coinbaseWalletSDK2.getCoinbaseWalletLogo("textWithLogoLight");
        expect(svgUri).toContain("viewBox='0 0 308.44 77.61'");
        expect(svgUri).toContain("fill:%23fefefe");
      });
    });

    describe("extension", () => {
      beforeAll(() => {
        // @ts-expect-error mocked provider
        window.coinbaseWalletExtension = mockExtensionProvider;
      });

      afterAll(() => {
        window.coinbaseWalletExtension = undefined;
      });

      test("@makeWeb3Provider", () => {
        // Returns extension provider
        expect(coinbaseWalletSDK2.makeWeb3Provider()).toEqual(
          mockExtensionProvider,
        );
      });

      test("@disconnect", async () => {
        jest
          .spyOn(mockExtensionProvider, "close")
          // @ts-expect-error expect string instead of void
          .mockImplementation(() => "mockClose");
        // Calls extension close
        coinbaseWalletSDK2.disconnect();
        expect(await mockExtensionProvider.close()).toBe("mockClose");
      });

      test("@setAppInfo", async () => {
        coinbaseWalletSDK2.setAppInfo("extension", "http://extension-logo.png");

        await waitFor(() => {
          expect(mockSetAppInfo).toBeCalledWith(
            "extension",
            "http://extension-logo.png",
          );
        });
      });
    });

    describe("cipher provider", () => {
      class MockCipherProviderClass extends MockProviderClass {
        public isCipher = true;

        constructor(opts: Readonly<CoinbaseWalletProviderOptions>) {
          super(opts);
        }
      }

      const mockCipherProvider = new MockCipherProviderClass({
        chainId: 1,
        jsonRpcUrl: "url",
        overrideIsMetaMask: false,
        relayEventManager: new WalletSDKRelayEventManager(),
        relayProvider: jest.fn(),
        storage: new ScopedLocalStorage("-walletlink"),
      });
      beforeAll(() => {
        // @ts-expect-error mocked provider
        window.coinbaseWalletExtension = mockCipherProvider;
      });

      afterAll(() => {
        window.coinbaseWalletExtension = undefined;
      });

      test("@makeWeb3Provider", () => {
        expect(coinbaseWalletSDK2.makeWeb3Provider()).toEqual(
          mockCipherProvider,
        );
      });

      test("@setAppInfo", () => {
        const relaySetAppInfoMock = jest
          .spyOn(WalletSDKRelay.prototype, "setAppInfo")
          .mockImplementation(() => "setAppInfo");
        coinbaseWalletSDK2.setAppInfo("cipher", "http://cipher-image.png");
        expect(relaySetAppInfoMock).not.toBeCalled();
      });
    });

    describe("coinbase browser iframe", () => {
      class MockCoinbaseBrowserProvider extends MockProviderClass {
        public isCoinbaseBrowser = true;

        constructor(opts: Readonly<CoinbaseWalletProviderOptions>) {
          super(opts);
        }
      }

      const mockCoinbaseBrowserProvider = new MockCoinbaseBrowserProvider({
        chainId: 1,
        jsonRpcUrl: "url",
        overrideIsMetaMask: false,
        relayEventManager: new WalletSDKRelayEventManager(),
        relayProvider: jest.fn(),
        storage: new ScopedLocalStorage("-walletlink"),
      });

      beforeAll(() => {
        window.ethereum = undefined;
        window.top!.ethereum = mockCoinbaseBrowserProvider;
      });

      test("@makeWeb3Provider", () => {
        expect(coinbaseWalletSDK2.makeWeb3Provider()).toEqual(
          mockCoinbaseBrowserProvider,
        );
      });
    });
  });
});
