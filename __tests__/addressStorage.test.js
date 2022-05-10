const { ensureAddressString } = require("../build/npm/dist/util");
const { CoinbaseWalletSDK } = require("../build/npm/dist");

describe("address storage tests", () => {
  it("ensureAddressString returns lowercase string", () => {
    const input = "0xFadAFCE89EA2221fa33005640Acf2C923312F2b9";
    const output = ensureAddressString(input);
    expect(output).toEqual("0xfadafce89ea2221fa33005640acf2c923312f2b9");
  });

  it("cannot mutate addresses via window.ethereum.enable()", done => {
    const coinbaseWalletSDK = new CoinbaseWalletSDK({
      appName: "My Awesome DApp",
      appLogoUrl: "https://example.com/logo.png",
    });

    const provider = coinbaseWalletSDK.makeWeb3Provider(
      "https://mainnet.infura.io/v3/INFURA_API_KEY",
      1,
    );

    provider._addresses = ["0xfadafce89ea2221fa33005640acf2c923312f2b9"];
    void provider.enable().then(addresses => {
      addresses[0] = "0xFadAFCE89EA2221fa33005640Acf2C923312F2b9";
      expect(provider._addresses[0]).toEqual(
        "0xfadafce89ea2221fa33005640acf2c923312f2b9",
      );
      done();
    });
  });

  it("cannot mutate addresses via window.ethereum.request eth_accounts", done => {
    const coinbaseWalletSDK = new CoinbaseWalletSDK({
      appName: "My Awesome DApp",
      appLogoUrl: "https://example.com/logo.png",
    });

    const provider = coinbaseWalletSDK.makeWeb3Provider(
      "https://mainnet.infura.io/v3/INFURA_API_KEY",
      1,
    );

    provider._addresses = ["0xfadafce89ea2221fa33005640acf2c923312f2b9"];
    void provider.request({ method: "eth_accounts" }).then(addresses => {
      addresses[0] = "0xFadAFCE89EA2221fa33005640Acf2C923312F2b9";
      expect(provider._addresses[0]).toEqual(
        "0xfadafce89ea2221fa33005640acf2c923312f2b9",
      );
      done();
    });
  });
});
