# Coinbase Wallet SDK

[![npm](https://img.shields.io/npm/v/@coinbase/wallet-sdk.svg)](https://www.npmjs.com/package/@coinbase/wallet-sdk)

## Overview

The Coinbase Wallet SDK connects your app to Coinbase Wallet so it can interact with the
Ethereum blockchain.

1. [Coinbase Wallet](https://wallet.coinbase.com)
   - [Docs](https://docs.cdp.coinbase.com/coinbase-wallet/overview)

### Installing the SDK

```bash
# npm
npm install @coinbase/wallet-sdk

# yarn
yarn add @coinbase/wallet-sdk
```

### SDK Setup and Usage

#### Upgrading the SDK

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

#### Basic SDK Usage

1. Initialize the SDK

   ```js
   const sdk = createCoinbaseWalletSDK({
     appName: 'SDK Playground',
   });
   ```

2. Make Coinbase Wallet Provider

   ```js
   const provider = sdk.evm.getProvider();
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

### Developing locally and running the test app

- The Coinbase Wallet SDK test app can be viewed here https://coinbase.github.io/coinbase-wallet-sdk/.
- To run it locally follow these steps:

  1. Fork this repo and clone it
  1. From the root dir run `yarn install`
  1. From the root dir run `yarn dev`
