# [DEPRECATED] Coinbase Wallet SDK v3.x.x

> **IMPORTANT**: This documentation is for v3.x.x which is now deprecated. Please migrate to v4.x.x and refer to the current documentation at [https://www.smartwallet.dev/](https://www.smartwallet.dev/).
>
> For migration assistance, please visit the [v3 to v4 migration guide](https://www.smartwallet.dev/sdk/v3-to-v4-changes).

- [Playground (v3)](https://coinbase.github.io/coinbase-wallet-sdk/)
- [Legacy Developer docs (v3)](https://docs.cloud.coinbase.com/wallet-sdk/docs)

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

## Next Steps

1. Upgrade to v4: `yarn add @coinbase/wallet-sdk@latest` or `npm install @coinbase/wallet-sdk@latest`
2. Follow the [migration guide](https://www.smartwallet.dev/sdk/v3-to-v4-changes) to update your code
3. Explore the [new documentation](https://www.smartwallet.dev/) for additional features and improvements
