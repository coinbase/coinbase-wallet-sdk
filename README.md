[![npm](https://img.shields.io/npm/v/@coinbase/wallet-sdk)](https://www.npmjs.com/package/@coinbase/wallet-sdk)

# Coinbase Wallet SDK

- [Playground](https://coinbase.github.io/coinbase-wallet-sdk/)
- [Developer docs](https://docs.cloud.coinbase.com/wallet-sdk/docs)

Coinbase Wallet SDK (formerly WalletLink) lets developers connect their dapps to Coinbase Wallet
on both mobile web (for iOS and Android) and desktop:

- **Mobile**: Users can connect to your mobile web dapp through a deeplink to the dapp browser in [Coinbase Wallet Mobile App](https://coinbase-wallet.onelink.me/q5Sx/fdb9b250).

- **Desktop**: Users can connect to your desktop app with a QR code in the [Coinbase Wallet Mobile App](https://coinbase-wallet.onelink.me/q5Sx/fdb9b250) or with the [Coinbase Wallet Chrome Extension](https://coinbase-wallet.onelink.me/q5Sx/fdb9b250).

Wallet SDK is open-source and uses minimal dependencies for maximum security and no code bloat. Simply drop a few lines of code into your dapp and Wallet SDK takes care of the rest.

## Getting started

This repo uses a yarn workspace. To get started, run:

```shell
yarn install

# To start the development server run the following command. This starts a nextjs app on port 3001. Any changes in the SDK become available through the app.
yarn dev

# To interact with the SDK directly:
yarn workspace @coinbase/wallet-sdk "<command>"

# To lint all files
yarn lint

# To typecheck all files
yarn typecheck
```

## Installing and Upgrading

> The installation package for **Coinbase Wallet SDK** (formerly WalletLink) is now named `@coinbase/wallet-sdk`.

- This [readme](/packages/wallet-sdk/README.md) contains brief instructions to get up and running.
- Visit our [public developer docs](https://docs.cloud.coinbase.com/wallet-sdk/docs) for more detail, including samples for integrating Coinbase Wallet using libraries like [web3-react](https://github.com/Uniswap/web3-react), [web3modal](https://github.com/Web3Modal/web3modal), [Web3-Onboard](https://docs.blocknative.com/onboard), and [wagmi](https://wagmi.sh/).

## Libraries using Coinbase Wallet SDK

- [blocknative/onboard](https://github.com/blocknative/onboard)
- [wagmi](https://github.com/tmm/wagmi)
- [web3-react](https://github.com/NoahZinsmeister/web3-react)
- [web3modal](https://github.com/Web3Modal/web3modal)

```
Copyright © 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
