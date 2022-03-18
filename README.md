# Coinbase Wallet SDK

Coinbase Wallet SDK (formerly WalletLink) lets developers connect their dapps to Coinbase Wallet
on both mobile web (for iOS and Android) and desktop:

- **Mobile**: Users can connect to your mobile web dapp through a deeplink to the
  dapp browser in Coinbase Wallet Mobile App.

- **Desktop**: Users can connect to your desktop app with a QR code in the
  Coinbase Wallet Mobile App or with the Coinbase Wallet Chrome Extension.

Wallet SDK is open-source and uses minimal dependencies for maximum security
and no code bloat. Simply drop a few lines of code into your dapp and Wallet
SDK takes care of the rest.

## Getting started

- This readme cointains brief instructions to get up and running.
- Visit our [public developer docs](https://docs.cloud.coinbase.com/wallet-sdk/docs) for more detail, including samples for integating Coinbase Wallet using libraries like [web3-react](https://github.com/NoahZinsmeister/web3-react), [web3modal](https://github.com/Web3Modal/web3modal), [Web3-Onboard](https://docs.blocknative.com/onboard), and [wagmi](https://wagmi.sh/).

## Installing and Upgrading

> The installation package for **Coinbase Wallet SDK** (formerly WalletLink) is now named `@coinbase/wallet-sdk`.

### Installing Wallet SDK

Install Coinbase Wallet SDK with yarn or npm.

#### Yarn

1. Check available versions of Wallet SDK.

```shell
yarn info @coinbase/wallet-sdk versions
```

2. Install a specific version or the latest version.

```shell
#yarn add @coinbase/wallet-sdk@3.0.0
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
#npm install @coinbase/wallet-sdk@3.0.0
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
    "@coinbase/wallet-sdk": "^3.0.0"
  }
}
```

3. Update Coinbase Wallet SDK to the latest available version.

```shell
npm update @coinbase/wallet-sdk
```

## Initializing Wallet SDK and a Wallet SDK-powered Web3 object

> Instructions are in [TypeScript](https://www.typescriptlang.org/). The usage
> is the same in JavaScript, except for the occasional TypeScript type
> annotation such as `string[]` or `as any`.

```typescript
// TypeScript
import CoinbaseWalletSDK from "@coinbase/wallet-sdk";
import Web3 from "web3";

const APP_NAME = "My Awesome App";
const APP_LOGO_URL = "https://example.com/logo.png";
const DEFAULT_ETH_JSONRPC_URL =
  "https://mainnet.infura.io/v3/<YOUR_INFURA_API_KEY>";
const DEFAULT_CHAIN_ID = 1;

// Initialize Coinbase Wallet SDK
export const coinbaseWallet = new CoinbaseWalletSDK({
  appName: APP_NAME,
  appLogoUrl: APP_LOGO_URL,
  darkMode: false
});

// Initialize a Web3 Provider object
export const ethereum = coinbaseWallet.makeWeb3Provider(
  DEFAULT_ETH_JSONRPC_URL,
  DEFAULT_CHAIN_ID
);

// Initialize a Web3 object
export const web3 = new Web3(ethereum as any);
```

Coinbase Wallet SDK uses an rpcUrl provided by Coinbase Wallet clients
regardless of the rpcUrl passed into `makeWeb3Provider` for whitelisted
networks. Wallet SDK needs an rpcUrl to be provided by the dapp as a fallback.

For more information on using alternate networks, see Switching / Adding Alternative EVM-Compatible Chains below.

## Getting Ethereum Accounts

Use [EIP-1102](https://eips.ethereum.org/EIPS/eip-1102) to obtain authorization and get Ethereum accounts. Invoking EIP-1102 shows a QR code dialog if the user's mobile wallet is not already connected to your app.

The following code runs in response to a user-initiated action such as clicking a button to ensure the pop up is not blocked by the browser.

```typescript
// Use eth_requestAccounts
ethereum.request("eth_requestAccounts").then((accounts: string[]) => {
  console.log(`User's address is ${accounts[0]}`);

  // Optionally, have the default account set for web3.js
  web3.eth.defaultAccount = accounts[0];
});

// Alternatively, you can use ethereum.enable()
ethereum.enable().then((accounts: string[]) => {
  console.log(`User's address is ${accounts[0]}`);
  web3.eth.defaultAccount = accounts[0];
});
```

Once the user obtains authorization, the Web3 object (`web3`) and the Web3
Provider (`ethereum`) are ready to be used.

> If you were using `ethereum.on("accountsChanged")`, remove it and obtain
> addresses with EIP-1102 callbacks instead. It was removed to improve
> compatibility with the latest web3.js.

## Switching / Adding Alternative EVM-Compatible Chains

Coinbase Wallet SDK and Coinbase Wallet clients support both [EIP-3326](https://eips.ethereum.org/EIPS/eip-3326) `wallet_switchEthereumChain` and [EIP-3085](https://eips.ethereum.org/EIPS/eip-3085) `wallet_addEthereumChain` requests for switching networks.

For dapps supporting multiple networks, Coinbase Wallet SDK only needs 1 rpcUrl -- the rpcUrl of the chain the dapp wishes to default users to.

If Wallet SDK receives either a `wallet_switchEthereumChain` or `wallet_addEthereumChain` request for a whitelisted network, then it switches the user to that network after asking approval from the user.

Current whitelisted networks:

| Whitelisted Networks        |
| :-------------------------- |
| Arbitrum                    |
| Arbitrum Rinkeby            |
| Avalanche                   |
| Avalanche Fuji              |
| Binance Smart Chain         |
| Binance Smart Chain Testnet |
| Ethereum                    |
| Fantom                      |
| Fantom Testnet              |
| Gorli                       |
| Kovan                       |
| Optimism                    |
| Optimistic Kovan            |
| Polygon                     |
| Polygon Mumbai              |
| Rinkeby                     |
| Ropsten                     |
| xDai                        |

Coinbase Wallet clients handle `wallet_addEthereumChain` requests for non-whitelisted networks (for example, a network such as `Harmony One` which is not currently supported by clients by default).

A dapp can determine if a network is whitelisted or not by sending a `wallet_switchEthereumChain` request for that network. If error code 4092 is returned, then the network is not supported by default by the client wallet.

### Example

Here's how to request the wallet switch networks:

```
await ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{ chainId: '0xA86A' }]
})
```

Here's how to request the client wallet add a new network

```
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x63564C40',
              rpcUrls: ['https://api.harmony.one'],
              chainName: 'Harmony Mainnet',
              nativeCurrency: { name: 'ONE', decimals: 18, symbol: 'ONE' },
              blockExplorerUrls: ['https://explorer.harmony.one'],
              iconUrls: ['https://harmonynews.one/wp-content/uploads/2019/11/slfdjs.png'],
            }],
          })
```

Many dapps attempt to switch to a network with `wallet_switchEthereumChain`,
determine if the network is supported by the wallet based on the error code,
and follow with a `wallet_addEthereumChain` request if the network is not
supported. Here's an example:

```
    try {
      // attempt to switch to Harmony One network
      const result = await ethereum.send('wallet_switchEthereumChain', [{ chainId: `0x63564C40` }])
    } catch (switchError) {
      // 4902 indicates that the client does not recognize the Harmony One network
      if (switchError.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x63564C40',
              rpcUrls: ['https://api.harmony.one'],
              chainName: 'Harmony Mainnet',
              nativeCurrency: { name: 'ONE', decimals: 18, symbol: 'ONE' },
              blockExplorerUrls: ['https://explorer.harmony.one'],
              iconUrls: ['https://harmonynews.one/wp-content/uploads/2019/11/slfdjs.png'],
            }],
          })
      }
    }
```

### Suggest client wallet track a specific token with EIP-747

Calling `wallet_watchAsset` method returns true/false if the asset is accepted/denied by the user, or an error if there is something wrong with the request.

Unlike other methods, the default definition of `wallet_watchAsset` params is not an array, but to keep it compatible with code conventions of other dapps, wallet-sdk supports both array and object format.

```typescript
interface WatchAssetParameters {
  type: string; // The asset's interface, e.g. 'ERC20'
  options: {
    address: string; // The hexadecimal Ethereum address of the token contract
    symbol?: string; // A ticker symbol or shorthand, up to 5 alphanumerical characters
    decimals?: number; // The number of asset decimals
    image?: string; // A string url of the token logo
  };
}
```

Here's an example of how to suggest the client wallet add a custom token:

```typescript
function onApproveWatchAsset() {
  // your approval callback implementation
}

function onDenyWatchAsset() {
  // your denying callback implementation
}

function onError(message: string) {
  // your error callback implementation
}

// Use wallet_watchAsset
ethereum.request({
  method: "wallet_watchAsset",
  params: {
    type: "ERC20",
    options: {
      address: "0xcf664087a5bb0237a0bad6742852ec6c8d69a27a",
      symbol: "WONE",
      decimals: 18,
      image:
        "https://s2.coinmarketcap.com/static/img/coins/64x64/11696.png",
    },
  },
  ,
})
.then((result: boolean) =>
  result ? onApproveWatchAsset() : onDenyWatchAsset()
)
.catch(err => onError(err.message));
```

## Disconnecting a Link

To disconnect or disestablish a link, call the instance method `disconnect()` on the `CoinbaseWallet` object/instance, or the instance method `close()` on the Coinbase Wallet SDK Web3 Provider object. This disestablishes the link, and requires the user to reconnect by scanning QR code again.

```typescript
coinbaseWallet.disconnect();
// is the same as the following:
ethereum.close();
```

## Libraries using Coinbase Wallet SDK

- [blocknative/onboard](https://github.com/blocknative/onboard)

- [wagmi](https://github.com/tmm/wagmi)

- [web3-react](https://github.com/NoahZinsmeister/web3-react)

- [web3modal](https://github.com/Web3Modal/web3modal)

---

```
Copyright © 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>

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

## Attributions

- [Eth-json-rpc-filters](https://github.com/MetaMask/eth-json-rpc-filters/blob/main/LICENSE) under the ISC license
- [Safe-event-emitter](https://github.com/MetaMask/safe-event-emitter/blob/master/LICENSE) under the ISC license
- [Json-rpc-engine](https://github.com/MetaMask/json-rpc-engine/blob/main/LICENSE) under the ISC license
- [Eth-rpc-errors](https://github.com/MetaMask/eth-rpc-errors/blob/main/LICENSE) under the MIT license
- [Eth-block-tracker](https://github.com/MetaMask/eth-block-tracker/blob/master/LICENSE) under the MIT license
