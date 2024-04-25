# Coinbase Wallet SDK

## Coinbase Wallet SDK lets developers connect their dapps to Coinbase Wallet in the following ways:

1. [Coinbase smart wallet](https://keys.coinbase.com/onboarding)

   - EIP-4337 account abstraction using passkeys
     - No passwords or PIN
     - No seed phrase management
     - No extension or app downloads
   - Near instant onboarding
   - Spend with Coinbase balance
   - Gas sponsorship via paymasters
   - Batch transactions
   - Desktop and mobile compatible

1. Coinbase Wallet mobile for [Android](https://play.google.com/store/apps/details?id=org.toshi&referrer=utm_source%3DWallet_LP) and [iOS](https://apps.apple.com/app/apple-store/id1278383455?pt=118788940&ct=Wallet_LP&mt=8)
   - Desktop: Users can connect to your dapp by scanning a QR code
   - Mobile: Users can connect to your mobile dapp through a deeplink to the dapp browser
1. Coinbase Wallet extension for [Chrome](https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad?hl=en) and [Brave](https://chromewebstore.google.com/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad?hl=en)
   - Desktop: Users can connect by clicking the connect with extension option.

## Installing and Upgrading

> Migrating from v3 to v4? Please see our [v4 migration guide](https://github.com/coinbase/coinbase-wallet-sdk/blob/docs/migration_guide.md) for a full list of breaking changes.

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

Upgrade Coinbase Wallet SDK using yarn or npm.

#### yarn/npm

1. Compare installed version with latest:

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

3. Request accounts to initialize connection to wallet

   ```js
   const addresses = provider.request('eth_requestAccounts');
   ```

4. Make more requests

   ```js
   provider.request('personal_sign', [
     `0x${Buffer.from('test message', 'utf8').toString('hex')}`,
     addresses[0],
   ]);
   ```

   [See more example methods in apps/testapp/src/components/RpcMethods/method](apps/testapp/src/components/RpcMethods/method)

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

### Developing locally and running the test dapp

- The Coinbase Wallet SDK test dapp can be viewed here https://coinbase.github.io/coinbase-wallet-sdk/.
- To run it locally follow these steps:

  1. Fork this repo and clone it
  1. From the root dir run `yarn install`
  1. `cd apps/testapp && yarn install` to install testapp dependencies
  1. From the root dir run `yarn dev`

  - starts two dev servers in parallel:
    - `@coinbase/wallet-sdk-testapp`
    - `@coinbase/wallet-sdk`

  1. Visit localhost:3001 in your browser to view the testapp

## Attributions

- [eth-rpc-errors](https://github.com/MetaMask/eth-rpc-errors/blob/main/LICENSE) under the MIT license
