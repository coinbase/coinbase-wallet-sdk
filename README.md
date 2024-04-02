# Coinbase Wallet SDK v4.x.x

Upgrading from v3? Please see our [migration guide](packages/wallet-sdk/docs/migration_guide.md).

Coinbase Wallet SDK lets developers connect their dapps to Coinbase Wallet. There are three Coinbase Wallet options:

1. [Coinbase smart wallet](https://keys.coinbase.com/onboarding)
   - Users can connect to your dapp with their Coinbase smart wallet
   - No EOA wallet required
   - Desktop and mobile compatibile
1. Coinbase Wallet mobile for [Android](https://play.google.com/store/apps/details?id=org.toshi&referrer=utm_source%3DWallet_LP) and [iOS](https://apps.apple.com/app/apple-store/id1278383455?pt=118788940&ct=Wallet_LP&mt=8)
   - Desktop: Users can connect to your dapp by scanning a QR code
   - Mobile: Users can connect to your mobile dapp through a deeplink to the dapp browser
1. Coinbase Wallet extension for [Chrome](https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad?hl=en) and [Brave](https://chromewebstore.google.com/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad?hl=en)
   - Desktop: Users can connect by clicking the connect with extension option.

## Installing and Upgrading

- This readme contains brief instructions to get up and running.
- Visit our [public developer docs](https://docs.cloud.coinbase.com/wallet-sdk/docs) for more detail, including samples for integrating Coinbase Wallet using libraries like [web3-react](https://github.com/Uniswap/web3-react), [web3modal](https://github.com/Web3Modal/web3modal), [Web3-Onboard](https://docs.blocknative.com/onboard), and [wagmi](https://wagmi.sh/).

### Installing Wallet SDK

Install Coinbase Wallet SDK with yarn or npm.

#### Yarn

1. Check available versions of Wallet SDK.

```shell
yarn info @coinbase/wallet-sdk versions
```

2. Install a specific version or the latest version.

```shell
#yarn add @coinbase/wallet-sdk@4.0.0
yarn add @coinbase/wallet-sdk
```

3. Check your installed version.

```shell
yarn list @coinbase/wallet-sdk
```

#### Npm

1. Check available versions of Wallet SDK.

```shell
npm view @coinbase/wallet-sdk versions
```

2. Install a specific version or the latest version.

```shell
#npm install @coinbase/wallet-sdk@4.0.0
npm install @coinbase/wallet-sdk
```

3. Check your installed version.

```shell
npm list @coinbase/wallet-sdk
```

### Upgrading Wallet SDK

Upgrade Coinbase Wallet SDK with yarn or npm.

#### Yarn

1. Compare your installed version of Coinbase Wallet SDK with the latest available version.

```shell
yarn outdated @coinbase/wallet-sdk
```

2. Update Coinbase Wallet SDK to the latest.

```shell
yarn upgrade @coinbase/wallet-sdk --latest
```

#### Npm

1. Compare your installed version of Coinbase Wallet SDK with the latest available version.

```shell
npm outdated @coinbase/wallet-sdk
```

2. If necessary, update `package.json` with the latest major version.

```shell
{
  "dependencies": {
    "@coinbase/wallet-sdk": "^4.0.0"
  }
}
```

3. Update Coinbase Wallet SDK to the latest available version.

```shell
npm update @coinbase/wallet-sdk
```

## Attributions

- [eth-json-rpc-filters](https://github.com/MetaMask/eth-json-rpc-filters/blob/main/LICENSE) under the ISC license
- [@metamask/json-rpc-engine](https://github.com/MetaMask/json-rpc-engine/blob/main/LICENSE) under the ISC license
- [eth-rpc-errors](https://github.com/MetaMask/eth-rpc-errors/blob/main/LICENSE) under the MIT license
- [eth-block-tracker](https://github.com/MetaMask/eth-block-tracker/blob/master/LICENSE) under the MIT license
