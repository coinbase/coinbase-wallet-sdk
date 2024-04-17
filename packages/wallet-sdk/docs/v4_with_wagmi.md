# Using Coinbase Wallet SDK v4 beta with wagmi

This quickstart guide walks through building a dapp for Coinbase smart wallet using wagmi.

## Steps:

1. **Create a new wagmi project**
   ```sh
   pnpm create wagmi
   ```
2. **Add the following resolutions block to your `package.json` to force wagmi to use the latest v4 beta [![npm](https://img.shields.io/npm/v/@coinbase/wallet-sdk/beta.svg)](https://www.npmjs.com/package/@coinbase/wallet-sdk/v/beta)**
   ```json
   "resolutions": {
       "@coinbase/wallet-sdk": "4.0.0-beta.6"
   },
   ```
3. **Install dependencies**
   ```sh
   pnpm install
   ```
4. **Start the test app**
   ```sh
   pnpm dev
   ```
5. **Configure the coinbaseWallet connector**

   - Only to `baseSepolia` is supported by http://keys.coinbase.com at this time.
   - Remove unecessary connectors
   - Edit `src/wagmi.ts` to look like this:

   ```typescript
   // src/wagmi.ts
   import { http, createConfig } from 'wagmi';
   import { baseSepolia } from 'wagmi/chains';
   import { coinbaseWallet } from 'wagmi/connectors';

   export const config = createConfig({
     chains: [baseSepolia],
     connectors: [coinbaseWallet({ appName: 'Create Wagmi', chainIds: [baseSepolia.id] })],
     transports: {
       [baseSepolia.id]: http(),
     },
   });

   declare module 'wagmi' {
     interface Register {
       config: typeof config;
     }
   }
   ```

   **Note: Any of the `CoinbaseWalletSDKOptions` may be passed to the `coinbaseWallet` connector:**

   - `appName: string`
     - Your dapp's name to display in wallet with requests
   - `appLogoUrl?: string`
     - Your dapp's logo
     - Favicon is used if unspecified
   - `chainIds?: number[]`
     - An array of chain ids your dapp supports
     - The first chain in this array will be used as the default chain.
     - Removes the need for non-mainnet dapps to request switching chains immediately.
     - Default value is `[1]` (mainnet), which is not supported by scw fe at this time.
   - `smartWalletOnly?: boolean;`
     - If `true`, hides options to connect via Coinbase Wallet mobile and Coinbase Wallet extension
     - Default value is `false`

6. **In the test app, click the 'Coinbase Wallet' button to open the smart wallet popup and connect!**
7. **Make more requests!**

   See all wagmi hooks with examples here: https://wagmi.sh/react/api/hooks
