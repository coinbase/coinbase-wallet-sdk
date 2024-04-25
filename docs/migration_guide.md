# Coinbase Wallet SDK Migration Guide (v3 to v4)

#### If you have any questions or feedback please [Join the Coinbase Developer Platform Discord Server!](https://discord.com/invite/cdp)

## `CoinbaseWalletSDK` changes

- `CoinbaseWalletSDK.disconnect()` is deprecated
  - dapps should call `CoinbaseWalletProvider.disconnect()` instead
- `CoinbaseWalletSDK.setAppInfo()` is deprecated
  - Dapps should pass in `appName` and `appLogoUrl` via `CoinbaseWalletSDKOptions` at SDK initialization
- `CoinbaseWalletSDK.makeWeb3Provider()` changes
  - v3:
    ```ts
    makeWeb3Provider(jsonRpcUrl?: string, chainId?: number): CoinbaseWalletProvider
    ```
  - v4:
    ```ts
    makeWeb3Provider(preference: Preference = { options: 'all' }): ProviderInterface
    ```
    - `Preference` details
      ```ts
      interface Preference {
        options: 'all' | 'smartWalletOnly' | 'eoaOnly';
        keysUrl?: string;
      }
      ```
      - `options`
        - `'all'` show both smart wallet and EOA options
        - `'smartWalletOnly'` Coinbase Wallet connection popup will only show smart wallet option
        - `'eoaOnly'` Coinbase wallet connection popup will only show EOA option
      - `keysUrl`
        - You probably don't need this. Use only if you'd like to use a frontend other than `"https://keys.coinbase.com/connect"` as your connection popup.
    - `ProviderInterface` details
      ```ts
      export interface ProviderInterface extends EventEmitter {
        request<T>(args: RequestArguments): Promise<T>;
        disconnect(): Promise<void>;
        on(event: 'connect', listener: (info: ProviderConnectInfo) => void): this;
        on(event: 'disconnect', listener: (error: ProviderRpcError) => void): this;
        on(event: 'chainChanged', listener: (chainId: string) => void): this;
        on(event: 'accountsChanged', listener: (accounts: string[]) => void): this;
        on(event: 'message', listener: (message: ProviderMessage) => void): this;
      }
      ```

## `CoinbaseWalletSDKOptions` changes

```ts
// v4
type CoinbaseWalletSDKOptions = {
  appName?: string | undefined;
  appLogoUrl?: string | null | undefined;
  appChainIds?: number[] | undefined;
};
```

### New (v4 only):

- `appChainIds?: number[]`
  - An array of chain IDs your dapp supports
  - The first chain in this array will be used as the default chain.
  - Removes the need for non-mainnet dapps to request switching chains before making first request.
  - Default value is `[1]` (mainnet)

### No Change (v4 and v3)

- `appName: string`
  - Your dapp's name to display in wallet with requests
- `appLogoUrl?: string`
  - Your dapp's logo
  - Favicon is used if unspecified

### Deprecated (v3 only):

- `enableMobileWalletLink` (enabled by default in v4)
- `jsonRpcUrl`
- `reloadOnDisconnect`
- `uiConstructor`
- `overrideIsMetaMask`
- `overrideIsCoinbaseWallet`
- `diagnosticLogger`
- `reloadOnDisconnect`
- `headlessMode`

## `CoinbaseWalletProvider` changes

### Eventing fix

- The `connect` event has been fixed to be [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193#connect) compliant in v4.
  - `on(event: 'connect', listener: (info: ProviderConnectInfo) => void): this;`
  - v3 returned `chainIdStr` erroneously - `interface ProviderConnectInfo {
 readonly chainIdStr: string;
}`
  - v4 returns `chainId` - `interface ProviderConnectInfo {
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
- `close`
- `send`
- `sendAsync`
- `scanQRCode`
- `genericRequest`
- `connectAndSignIn`
- `selectProvider`
- `supportsSubscriptions`
- `subscribe`
- `unsubscribe`
