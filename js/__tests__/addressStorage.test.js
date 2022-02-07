const { ensureAddressString } = require("../build/npm/dist/util");
const {WalletLink} = require("../build/npm/dist");

describe("address storage tests", function() {
  it("ensureAddressString returns lowercase string", function() {
    let input = "0xFadAFCE89EA2221fa33005640Acf2C923312F2b9"
    let output = ensureAddressString(input)
    expect(output).toEqual("0xfadafce89ea2221fa33005640acf2c923312f2b9")
  })

  it("cannot mutate addresses via window.ethereum.enable()", done => {
    const walletLink = new WalletLink({
      appName: "My Awesome DApp",
      appLogoUrl: "https://example.com/logo.png"
    })

    const provider = walletLink.makeWeb3Provider(
        "https://mainnet.infura.io/v3/INFURA_API_KEY", 1
    )

    provider._addresses = ["0xfadafce89ea2221fa33005640acf2c923312f2b9"]
    provider.enable().then(addresses => {
      addresses[0] = "0xFadAFCE89EA2221fa33005640Acf2C923312F2b9"
      expect(provider._addresses[0]).toEqual("0xfadafce89ea2221fa33005640acf2c923312f2b9")
      done()
    })
  })

  it("cannot mutate addresses via window.ethereum.request eth_accounts", done => {
    const walletLink = new WalletLink({
      appName: "My Awesome DApp",
      appLogoUrl: "https://example.com/logo.png"
    })

    const provider = walletLink.makeWeb3Provider(
        "https://mainnet.infura.io/v3/INFURA_API_KEY", 1
    )

    provider._addresses = ["0xfadafce89ea2221fa33005640acf2c923312f2b9"]
    provider.request({method: "eth_accounts"}).then(addresses => {
      addresses[0] = "0xFadAFCE89EA2221fa33005640Acf2C923312F2b9"
      expect(provider._addresses[0]).toEqual("0xfadafce89ea2221fa33005640acf2c923312f2b9")
      done()
    })
  })
})