# Coinbase Wallet SDK

[![npm](https://img.shields.io/npm/v/@coinbase/wallet-sdk.svg)](https://www.npmjs.com/package/@coinbase/wallet-sdk)

> **Rebrand:** Base Account is now Coinbase Wallet. The npm package remains `@coinbase/wallet-sdk` — it has not been renamed or merged. `@coinbase/wallet-sdk` is **not** the current recommended SDK. Use `@base-org/account` (Base Account SDK) until the next-generation Coinbase Wallet SDK is ready. Existing `@coinbase/wallet-sdk` integrations continue to work.

## Coinbase Wallet SDK allows dapps to connect to Coinbase Wallet

1. [Coinbase Wallet](https://wallet.coinbase.com)
   - [Docs](https://docs.cdp.coinbase.com/coinbase-wallet/overview)
1. Coinbase Wallet mobile for [Android](https://play.google.com/store/apps/details?id=org.toshi&referrer=utm_source%3DWallet_LP) and [iOS](https://apps.apple.com/app/apple-store/id1278383455?pt=118788940&ct=Wallet_LP&mt=8)
   - Desktop: Users can connect to your dapp by scanning a QR code
   - Mobile: Users can connect to your mobile dapp through a deeplink to the dapp browser
1. Coinbase Wallet extension for [Chrome](https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad?hl=en) and [Brave](https://chromewebstore.google.com/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad?hl=en)
   - Desktop: Users can connect by clicking the connect with an extension option.

### Installing Wallet SDK

1. Check available versions:

   ```shell
     # yarn
     yarn info @coinbase/wallet-sdk versions

     # npm
     npm view @coinbase/wallet-sdk versions
   ```

2. Install latest version:

   ```shell
   # yarn
   yarn add @coinbase/wallet-sdk

   # npm
   npm install @coinbase/wallet-sdk
   ```

3. Check installed version:

   ```shell
   # yarn
   yarn list @coinbase/wallet-sdk

   # npm
   npm list @coinbase/wallet-sdk
   ```

### Upgrading Wallet SDK

> Migrating from v3 to v4? Please see our [v4 migration guide](https://www.smartwallet.dev/sdk/v3-to-v4-changes) for a full list of breaking changes.

1. Compare the installed version with the latest:

   ```shell
   # yarn
   yarn outdated @coinbase/wallet-sdk

   # npm
   npm outdated @coinbase/wallet-sdk
   ```

2. Update to latest:

   ```shell
   # yarn
   yarn upgrade @coinbase/wallet-sdk --latest

   # npm
   npm update @coinbase/wallet-sdk
   ```

### Basic Usage

1. Initialize SDK

   ```js
   const sdk = new CoinbaseWalletSDK({
     appName: 'SDK Playground',
   });
   ```

2. Make web3 Provider

   ```js
   const provider = sdk.makeWeb3Provider();
   ```

3. Request accounts to initialize a connection to wallet

   ```js
   const addresses = provider.request({
     method: 'eth_requestAccounts',
   });
   ```

4. Make more requests

   ```js
   provider.request('personal_sign', [
     `0x${Buffer.from('test message', 'utf8').toString('hex')}`,
     addresses[0],
   ]);
   ```

5. Handle provider events

   ```js
   provider.on('connect', (info) => {
     setConnect(info);
   });

   provider.on('disconnect', (error) => {
     setDisconnect({ code: error.code, message: error.message });
   });

   provider.on('accountsChanged', (accounts) => {
     setAccountsChanged(accounts);
   });

   provider.on('chainChanged', (chainId) => {
     setChainChanged(chainId);
   });

   provider.on('message', (message) => {
     setMessage(message);
   });
   ```

### One connection at a time

The SDK keeps its connection state — configuration, connected account, sub-accounts and
keys — in a single module-level store. Creating a second SDK instance therefore replaces
the first rather than sitting alongside it, so a page cannot hold connections to two
wallets at once:

```js
const a = createCoinbaseWalletSDK({ appName: 'Wallet A' });
const b = createCoinbaseWalletSDK({ appName: 'Wallet B' });
// `a` and `b` are different objects, but they share one connection state,
// and it now belongs to B.
```

Calling it again with the same metadata is fine and expected — React strict mode and hot
reloading both do it. Calling it with *different* metadata logs a warning, because that is
almost always a caller expecting two independent connections.

Support for connecting multiple wallets simultaneously is tracked in
[#1860](https://github.com/coinbase/coinbase-wallet-sdk/issues/1860).

### Developing locally and running the test dapp

- The Coinbase Wallet SDK test dapp can be viewed here https://coinbase.github.io/coinbase-wallet-sdk/.
- To run it locally follow these steps:

  1. Fork this repo and clone it
  1. From the root dir run `yarn install`
  1. From the root dir run `yarn dev`
