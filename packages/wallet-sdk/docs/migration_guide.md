# Coinbase Wallet SDK Migration Guide (v3.x.x to v4.x.x)

## Breaking Changes

### Changes to `CoinbaseWalletSDKOptions`

#### The following options have been removed

- `chainId`
  - replaced by `chainIds` [see below](#the-following-options-have-been-added)
- `enableMobileWalletLink`
- `jsonRpcUrl`
- `reloadOnDisconnect`
- `uiConstructor`
- `overrideIsMetaMask`
- `overrideIsCoinbaseWallet`
- `diagnosticLogger`
- `reloadOnDisconnect`
- `headlessMode`

#### The following options have been added

- `chainIds?: number[]`
  - An array of chain ids your dapp supports
  - The first chain in this array (`chainIds[0]`) will be used as the default chain
  - If no chain ids are passed, mainnet will be used as the fallback
- `smartWalletOnly?: boolean;`
  - If `true`, hides options to connect via Coinbase Wallet mobile and Coinbase Wallet extension
  - Default value is `false`
