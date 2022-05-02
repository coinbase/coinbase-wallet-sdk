const webcrypto = require("crypto");

Object.defineProperty(global.self, "crypto", {
  value: {
    getRandomValues: (arr: Uint8Array) => webcrypto.randomBytes(arr.length)
  }
});
