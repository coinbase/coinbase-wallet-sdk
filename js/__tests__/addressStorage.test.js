const { ensureAddressString } = require("../build/npm/dist/util");

describe("address storage tests", function() {
  it("ensureAddressString returns lowercase string", function() {
    let input = "0xFadAFCE89EA2221fa33005640Acf2C923312F2b9"
    let output = ensureAddressString(input)
    expect(output).toEqual("0xfadafce89ea2221fa33005640acf2c923312f2b9")
  })
})