# WalletLink

WalletLink is an open protocol that lets users connect their mobile wallets to
your DApp.

With WalletLink, users can use your application in any desktop browser without
installing an extension, and the secure tunnel established between your app and
the mobile wallet with end-to-end encryption utilizing client-generated keys
keeps all user activity private.

For DApp developers to integrate with WalletLink, all you need to do is drop a
few lines of code into your application, and WalletLink will take care of the
rest. WalletLink is open-source and uses minimal dependencies for maximum
security and no code bloat.

## Getting Started

### Installation

```shell
# With Yarn
yarn add walletlink

# With NPM
npm install walletlink
```

The following instructions are in [TypeScript](https://www.typescriptlang.org/),
but the usage is the same in JavaScript, except for the occasional type
annotations, for example `: string[]` or `as any`.

### Upgrading from WalletLink 1.0 to 2.0

For most users, simply update the NPM package, and you should be good to go.

If you were using `ethereum.on("accountsChanged")`, please remove it and obtain
addresses via [EIP-1102](#use-eip-1102-to-obtain-authorization-and-get-ethereum-accounts)
callbacks instead. It's removed to improve compatibility with the latest web3.js.

Dark mode theme (`darkMode`) is now available as an option to WalletLink
constructor.

### Initializing WalletLink and a WalletLink-powered Web3 object

```typescript
// TypeScript
import WalletLink from 'walletlink'
import Web3 from 'web3'

const APP_NAME = 'My Awesome App'
const APP_LOGO_URL = 'https://example.com/logo.png'
const ETH_JSONRPC_URL = 'https://mainnet.infura.io/v3/<YOUR_INFURA_API_KEY>'
const CHAIN_ID = 1

// Initialize WalletLink
export const walletLink = new WalletLink({
  appName: APP_NAME,
  appLogoUrl: APP_LOGO_URL,
  darkMode: false
})

// Initialize a Web3 Provider object
export const ethereum = walletLink.makeWeb3Provider(ETH_JSONRPC_URL, CHAIN_ID)

// Initialize a Web3 object
export const web3 = new Web3(ethereum as any)
```

### Use EIP-1102 to obtain authorization and get Ethereum accounts

Invoking EIP-1102 will show a QR code dialog if the user's mobile wallet is not
already connected to your app. The following code should run in response to a
user-initiated action such as clicking a button to ensure the pop up is not
blocked by the browser.

```typescript
// Use eth_RequestAccounts
ethereum.send('eth_requestAccounts').then((accounts: string[]) => {
  console.log(`User's address is ${accounts[0]}`)

  // Optionally, have the default account set for web3.js
  web3.eth.defaultAccount = accounts[0]
})

// Alternatively, you can use ethereum.enable()
ethereum.enable().then((accounts: string[]) => {
  console.log(`User's address is ${accounts[0]}`)
  web3.eth.defaultAccount = accounts[0]
})
```

That's it! Once the authorization is obtained from the user, the Web3 object
(`web3`) and the Web3 Provider (`ethereum`) are ready to be used as per usual.

### Disconnecting / De-establishing a link

To disconnect, call the instance method `disconnect()` on the WalletLink object,
or the instance method `close()` on the WalletLink Web3 Provider object. This
will de-establish the link, and require user to reconnect by scanning QR code
again.

```typescript
walletLink.disconnect()
// is the same as the following:
ethereum.close()
```

---

```
Copyright © 2018-2020 WalletLink.org <https://www.walletlink.org/>
Copyright © 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>

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
