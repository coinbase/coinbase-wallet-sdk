import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK";
import { WalletSDKUI } from "./provider/WalletSDKUI";

jest.mock("./provider/WalletSDKUI");

describe("CoinbaseWalletSDK", () => {
  test("initializes", () => {
    const cbWallet = new CoinbaseWalletSDK({
      appName: "Test",
      appLogoUrl: ""
    });

    expect(cbWallet).toHaveBeenCalledTimes(1);
  });
});
