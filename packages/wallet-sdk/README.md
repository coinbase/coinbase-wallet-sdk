# Coinbase Wallet SDK

## Coinbase Wallet SDK allows dapps to connect to Coinbase Wallet

1. [Coinbase Wallet](https://account.base.org/)
   - [Docs](https://www.base.org/builders/smart-wallet)

### Installing Coinbase Wallet SDK

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

### Upgrading Coinbase Wallet SDK

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

1. Initialize Coinbase Wallet SDK

   ```js
   const sdk = createCoinbaseWalletSDK({
     appName: 'SDK Playground',
     appChainIds: [8453],
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

### CAIP sessions

`wallet_connect` remains available as the dapp-facing ERC-7846 API. The SDK
translates every connect request into CAIP-25 `wallet_createSession`, persists
the wallet-issued grants, and maps the result back to the `wallet_connect`
accounts response. Connected-session refreshes use the same CAIP-25 path rather
than invoking `wallet_connect` through CAIP-27.

Use `sdk.connect()` to authorize EVM and Solana together with one CAIP-25 approval:

```ts
const connection = await sdk.connect();
```

EVM chains come from `appChainIds` passed to `createCoinbaseWalletSDK`; they are
not repeated in `connect()`. Pass `true` to select a basic connection for only
one namespace:

```ts
const evmConnection = await sdk.connect({ evm: true });
const solanaConnection = await sdk.connect({ solana: true });
```

Use an options object instead of `true` to request capabilities. Capability
payloads are intentionally opaque so new capabilities and namespaces do not
require redesigning the shared API:

```ts
const connection = await sdk.connect({
  evm: {
    capabilities: {
      aos: {
        nonce: evmNonce,
        apiUrl: 'https://api.wallet.coinbase.com',
      },
    },
  },
  solana: {
    capabilities: {
      aos: {
        nonce: solanaNonce,
        apiUrl: 'https://api.wallet.coinbase.com',
      },
    },
  },
});
```

Capability results belong to the account that granted them:

```ts
{
  evm: {
    accounts: [{
      address: '0x1234...',
      capabilities: {
        aos: { signature: '0xabcd...', isSCW: true },
      },
    }],
  },
  solana: {
    accounts: [{
      address: '9xQeWvG816bUx9EP...',
      capabilities: {
        aos: { signature: '4vJ9JU1bJJE96FWS...' },
      },
    }],
  },
}
```

Each selected namespace remains in the result when the wallet grants only part
of a request. For example, an account without Solana returns:

```ts
{
  evm: { accounts: [{ address: '0x1234...' }] },
  solana: { accounts: [] },
}
```

An omitted capability result is returned on each connected account as a
serialized `4200` unsupported-capability error. `addSubAccount` and
`spendPermissions` are intentionally not forwarded by `sdk.connect()`; use the
EIP-1193 provider or `sdk.subAccount` APIs for those flows. Inputs remain open
to future namespaces, while EVM and Solana are the namespaces currently
implemented.

Inside a Coinbase-hosted in-app browser or extension, EVM uses the injected
`wallet_connect` method and Solana reads the host Wallet Standard connection
silently. The SDK does not open a popup or create a parallel CAIP session there.
Outside a Coinbase host, calling `sdk.connect()` updates an already-created
popup EIP-1193 provider and SDK-registered Solana Wallet Standard wallet from
the shared session.

### Experimental Solana API

Solana is explicitly enabled by registering a Wallet Standard wallet:

```ts
const sdk = createCoinbaseWalletSDK({ appName: 'My dapp' });
sdk.registerSolanaWallet();
```

The initial scope supports Solana mainnet, `connect`, `disconnect`,
`signMessage`, `signTransaction`, `signAndSendTransaction`, and
`signAndSendAllTransactions`. Batch sign-and-send uses one dedicated CAIP-27
request and preserves serial/parallel mode plus ordered settled results.
`solana:signIn` is not advertised yet. Inside the Coinbase Wallet InAppBrowser,
the host already provides Wallet Standard registration, so this function is a no-op.

For new dapps, Solana recommends
[`@solana/kit`](https://solana.com/docs/clients/official/javascript) with Wallet
Standard. The dapp's Wallet Standard or Kit wallet plugin discovers the wallet
registered above. Calling `createCoinbaseWalletSDK()` by itself performs no Solana
initialization or global registration.

> **Release boundary:** Normal-browser Solana popup requests require an SCW
> release that supports the CAIP-25 Solana scopes and CAIP-27 methods described
> above.

### Developing locally and running the test dapp

- The Coinbase Wallet SDK test dapp can be viewed here https://base.github.io/account-sdk/.
- To run it locally follow these steps:

  1. Fork this repo and clone it
  1. From the root dir run `yarn install`
  1. From the root dir run `yarn dev`

## Script Tag Usage

Coinbase Wallet can be used directly in HTML pages via a script tag, without any build tools:

```html
<!-- Via unpkg -->
<script src="https://unpkg.com/@coinbase/wallet-sdk/dist/coinbase-wallet-sdk.min.js"></script>

<!-- Via jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@coinbase/wallet-sdk/dist/coinbase-wallet-sdk.min.js"></script>
```

Once loaded, the SDK is available as `window.base` and `window.createCoinbaseWalletSDK`:

```javascript
// Make a payment
const result = await window.base.pay({
  amount: "10.50",
  to: "0xYourAddress...",
  testnet: true
});

// Check payment status
const status = await window.base.getPaymentStatus({
  id: result.id,
  expectedPayment: {
    amount: "10.50",
    recipient: "0xYourAddress..."
  },
  testnet: true
});

// Create Coinbase Wallet Provider
const provider = window.createCoinbaseWalletSDK().getProvider()
```

For production payment verification, call `getPaymentStatus` on your backend and populate
`expectedPayment` from trusted server-side order data. Omitting it preserves backward compatibility
but does not verify the order amount or recipient. Bind each payment ID to one order and reject IDs
that have already been used for fulfillment.
