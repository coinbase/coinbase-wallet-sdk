const webcrypto = require("crypto").webcrypto;

Object.assign(global, require("jest-chrome"));

Object.assign(global, {
  crypto: webcrypto
});

webcrypto.getRandomValues = (array: any) => {
  return array;
};
