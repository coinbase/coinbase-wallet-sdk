export default {
  input: 'src/browser-entry.ts',
  platform: 'browser',
  tsconfig: 'tsconfig.json',
  output: {
    file: 'dist/coinbase-wallet-sdk.min.js',
    format: 'umd',
    name: 'CoinbaseWalletSDK',
    sourcemap: true,
    minify: true,
    codeSplitting: false,
  },
};
