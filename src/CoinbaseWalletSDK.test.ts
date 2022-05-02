import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK";
import { CoinbaseWalletProvider } from "./provider/CoinbaseWalletProvider";

jest.mock("./provider/WalletSDKUI");

describe("CoinbaseWalletSDK", () => {
  test("initializes with defaults", () => {
    const cbWallet = new CoinbaseWalletSDK({
      appName: "",
      appLogoUrl: ""
    });

    expect(cbWallet).toMatchObject({
      _appLogoUrl: null,
      _appName: "DApp",
      _overrideIsMetaMask: false,
      _overrideIsCoinbaseWallet: true
    });
  });

  describe("methods", () => {
    let coinbaseWalletSDK: CoinbaseWalletSDK;
    beforeEach(() => {
      coinbaseWalletSDK = new CoinbaseWalletSDK({
        appName: "Test",
        appLogoUrl: "http://coinbase.com/wallet-logo.png"
      });
    });
    test("getQrUrl", () => {
      const qrUrl = coinbaseWalletSDK.getQrUrl() || "";

      const url = new URL(qrUrl);

      expect(url.hostname).toEqual("www.walletlink.org");
      expect(url.hash.split("=")).toHaveLength(5);
    });

    test("makeWeb3Provider", () => {
      expect(coinbaseWalletSDK.makeWeb3Provider()).toBeInstanceOf(
        CoinbaseWalletProvider
      );
    });

    test.skip("setAppInfo", () => {
      expect(coinbaseWalletSDK.setAppInfo("", null)).toBeCalled();
    });

    test.skip("disconnect", () => {
      expect(coinbaseWalletSDK.disconnect()).toBeCalled();
    });
  });
});
