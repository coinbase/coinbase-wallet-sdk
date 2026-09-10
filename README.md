# Coinbase Wallet SDK

[![npm](https://img.shields.io/npm/v/@base-org/account.svg)](https://www.npmjs.com/package/@base-org/account)

## Overview

The Coinbase Wallet SDK provides two distinct sets of functionality:

### 1. **Base Pay & Base Subscriptions** (Standalone Functions)
Purely functional payment and subscription APIs that work immediately without any SDK setup or wallet connection.

### 2. **Coinbase Wallet SDK** (Full SDK)
Complete SDK for connecting to Coinbase Wallet and interacting with the Ethereum blockchain.

---

## Base Pay - Quick Start

**Base Pay allows you to accept USDC payments with just 3 lines of code.** No SDK instantiation or wallet connection required.

### Installation

```bash
# npm
npm install @base-org/account

# yarn
yarn add @base-org/account
```

### Accept a Payment

```typescript
import { pay } from '@base-org/account';

// That's it! Just call the pay function directly
const payment = await pay({
  amount: "10.50",                                    // Amount in USDC
  to: "0xYourWalletAddress",                         // Your wallet address
  dataSuffix: "0xabc123",                             // Optional attribution data suffix
  testnet: true                                       // Use testnet for testing
});

console.log(`Payment successful! ID: ${payment.id}`);
```

### Check Payment Status

```typescript
import { getPaymentStatus } from '@base-org/account';

const status = await getPaymentStatus({
  id: payment.id,
  expectedPayment: {
    amount: "10.50",                                 // From your server-side order
    recipient: "0xYourWalletAddress"
  },
  testnet: true
});

console.log(`Payment status: ${status.status}`);
```

Run this check on your backend before fulfillment. `expectedPayment` is optional for backward
compatibility, but production merchants should always provide trusted order values. Without it,
`completed` only confirms that the operation contained a positive USDC transfer; it does not confirm
the order's amount or recipient. Bind each payment ID to one order and reject IDs that have already
been used for fulfillment.

---

## Base Subscriptions - Quick Start

**Base Subscriptions lets you create recurring USDC payments**

### Create a Subscription

```typescript
import { subscribe } from '@base-org/account';

// Create a monthly subscription - that's all!
const subscription = await subscribe({
  recurringCharge: "9.99",                           // Amount to charge per period
  subscriptionOwner: "0xYourAppAddress",             // Your app's address
  periodInDays: 30,                                  // Billing period
  testnet: true                                       // Use testnet for testing
});

console.log(`Subscription created! ID: ${subscription.id}`);
```

### Check Subscription Status

```typescript
import { getSubscriptionStatus } from '@base-org/account';

const status = await getSubscriptionStatus({
  id: subscription.id,
  testnet: true
});

console.log(`Active: ${status.isSubscribed}`);
console.log(`Next charge: ${status.nextPeriodStart}`);
```

### Charge a Subscription

Store the subscription `id` on your backend against the authenticated user when they subscribe.
Do not charge an arbitrary `id` supplied by the browser alone — treat it as a capability handle,
not proof of ownership.

```typescript
import { base } from '@base-org/account';

// Browser / custom wallet path: prepare call data, then send from your subscription owner
const chargeCalls = await base.subscription.prepareCharge({
  id: storedSubscriptionId,
  amount: '9.99',        // or 'max-remaining-charge'
  testnet: true,
  expectedSpender: subscriptionOwner,       // your app's spender address
  expectedPayer: authenticatedUserAddress,  // subscriber wallet from your session
});

// Execute the charge using your wallet provider
// (This step requires your app's wallet to execute the transaction)
```

```typescript
import { base } from '@base-org/account/node';

// Node path: charge() requires the permission spender to be your CDP smart wallet.
// Pass expectedPayer to ensure the subscription belongs to the authenticated user.
const charge = await base.subscription.charge({
  id: storedSubscriptionId,
  amount: '9.99',
  testnet: true,
  expectedPayer: authenticatedUserAddress,
});
```



## Coinbase Wallet SDK (Full SDK)

For applications that need full wallet connectivity and blockchain interactions beyond payments:

1. [Coinbase Wallet](https://account.base.app)
   - [Docs](https://docs.base.org/base-account/quickstart/web)

### Installing the SDK

```bash
# npm
npm install @base-org/account

# yarn
yarn add @base-org/account
```

### SDK Setup and Usage

> **Note:** The following sections apply only to the full Coinbase Wallet SDK functionality. For payments and subscriptions, use the standalone functions shown above.

#### Upgrading the SDK

1. Compare the installed version with the latest:

   ```shell
   # yarn
   yarn outdated @base-org/account

   # npm
   npm outdated @base-org/account
   ```

2. Update to latest:

   ```shell
   # yarn
   yarn upgrade @base-org/account --latest

   # npm
   npm update @base-org/account
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
   const provider = sdk.getProvider();
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

- The Coinbase Wallet SDK test app can be viewed here https://base.github.io/account-sdk/.
- To run it locally follow these steps:

  1. Fork this repo and clone it
  1. From the root dir run `yarn install`
  1. From the root dir run `yarn dev`
