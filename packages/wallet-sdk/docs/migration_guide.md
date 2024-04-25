# Coinbase Wallet SDK Migration Guide (v3 to v4)

## `CoinbaseWalletSDK` changes

- `CoinbaseWalletSDK.disconnect()` public instance method is deprecated
  - still in place but only clears storage and does not reset WalletLink
  - dapps should call `CoinbaseWalletProvider.disconnect()` instead
- `CoinbaseWalletSDK.setAppInfo()` public instance method is deprecated for non-extension use cases
  - Dapps should pass in `appName` and `appLogoUrl` via `CoinbaseWalletSDKOptions` at SDK initialization

## `CoinbaseWalletSDKOptions` changes

```
// v4
export interface CoinbaseWalletSDKOptions {
  appName: string;
  appLogoUrl?: string;
  chainIds?: number[];
  smartWalletOnly?: boolean;
}
```

### deprecated options from v3:

- `enableMobileWalletLink` (enabled by default in v4)
- `jsonRpcUrl`
- `reloadOnDisconnect`
- `uiConstructor`
- `overrideIsMetaMask`
- `overrideIsCoinbaseWallet`
- `diagnosticLogger`
- `reloadOnDisconnect`
- `headlessMode`

### new options included in v4:

- `chainIds?: number[]`
  - An array of chain ids your dapp supports
  - The first chain in this array will be used as the default chain.
  - Removes the need for non-mainnet dapps to request switching chains immediately.
  - Default value is `[1]` (mainnet)
- `smartWalletOnly?: boolean;`
  - If `true`, hides options to connect via Coinbase Wallet mobile and Coinbase Wallet extension
  - Default value is `false`

### present in both v3 and v4

- `appName: string`
  - Your dapp's name to display in wallet with requests
- `appLogoUrl?: string`
  - Your dapp's logo
  - Favicon is used if unspecified

## `CoinbaseWalletProvider` changes

### Eventing fix

- The `connect` event has been fixed to be [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193#connect) compliant in v4.
  - `on(event: 'connect', listener: (info: ProviderConnectInfo) => void): this;`
  - v3 returned `chainIdStr` - `interface ProviderConnectInfo {
 readonly chainIdStr: string;
}`
- v4 returns `chainId`
  - `interface ProviderConnectInfo {
 readonly chainId: string;
}`

### Removed public instance properties

- `isCoinbaseBrowser: boolean`
- `qrUrl?: string | null`
- `reloadOnDisconnect: boolean`

### Removed public getter methods

- `selectedAddress`
- `networkVersion`
- `isWalletLink`
- `ismetaMask`
- `host`

### Removed public methods

- `disableReloadOnDisconnect`
- `setProviderInfo`
- `setAppInfo`
- `close` - still in use for extension connections
- `send`
- `sendAsync`
- `scanQRCode`
- `genericRequest`
- `connectAndSignIn`
- `selectProvider`
- `supportsSubscriptions`
- `subscribe`
- `unsubscribe`
