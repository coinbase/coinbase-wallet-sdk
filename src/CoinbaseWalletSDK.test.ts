import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK";

jest.mock("./provider/WalletSDKUI", () => class MockWalletSDKUI {});

describe("CoinbaseWalletSDK", () => {
  test("initializes", () => {
    const cbWallet = new CoinbaseWalletSDK({
      appName: "Test",
      appLogoUrl: ""
    });

    expect(cbWallet).toHaveBeenCalledTimes(1);
  });
});
