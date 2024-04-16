# Coinbase Wallet SDK

[![npm](https://img.shields.io/npm/v/@coinbase/wallet-sdk.svg)](https://www.npmjs.com/package/@coinbase/wallet-sdk)
[![npm](https://img.shields.io/npm/v/@coinbase/wallet-sdk/beta.svg)](https://www.npmjs.com/package/@coinbase/wallet-sdk/v/beta)

> See our [Smart Wallet Setup](https://docs.cloud.coinbase.com/wallet-sdk/docs/sw-setup) documentation to try out smart wallets with v4 beta.

## Coinbase Wallet SDK lets developers connect their dapps to Coinbase Wallet in the following ways:

1. [Coinbase smart wallet](https://keys.coinbase.com/onboarding) (v4 only)
   - EIP-4337 account abstraction using passkeys
     - No passwords or PIN
     - No seed phrase management
     - No EOA wallet app
     - Onboard in seconds
   - Spend with Coinbase balance
   - Desktop and mobile compatible
1. Coinbase Wallet mobile for [Android](https://play.google.com/store/apps/details?id=org.toshi&referrer=utm_source%3DWallet_LP) and [iOS](https://apps.apple.com/app/apple-store/id1278383455?pt=118788940&ct=Wallet_LP&mt=8)
   - Desktop: Users can connect to your dapp by scanning a QR code
   - Mobile: Users can connect to your mobile dapp through a deeplink to the dapp browser
1. Coinbase Wallet extension for [Chrome](https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad?hl=en) and [Brave](https://chromewebstore.google.com/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad?hl=en)
   - Desktop: Users can connect by clicking the connect with extension option.

## Installing and Upgrading

> Migrating from v3 to v4? Please see our [v4 migration guide](packages/wallet-sdk/docs/migration_guide.md) for a full list of breaking changes.

- This readme contains brief instructions to get up and running.
- Visit our [public developer docs](https://docs.cloud.coinbase.com/wallet-sdk/docs) for more detail, including samples for integrating Coinbase Wallet using libraries like [web3-react](https://github.com/Uniswap/web3-react), [web3modal](https://github.com/Web3Modal/web3modal), [Web3-Onboard](https://docs.blocknative.com/onboard), and [wagmi](https://wagmi.sh/).

### Installing Wallet SDK

Install Coinbase Wallet SDK using yarn or npm.

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
