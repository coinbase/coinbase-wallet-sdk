# Add smart wallet connectivity to an existing app with wagmi

- This quickstart guide walks through add smart wallet connectivity to an existing app.
- If you'd like to create a new app with smart wallet connectivity, [here are the instructions](v4_with_wagmi.md).

1. **Force wagmi to use Coinbase wallet SDKv4 beta by adding this to your `package.json`**
   ```ts
   "resolutions": {
       "@coinbase/wallet-sdk": "4.0.0-beta.12"
   },
   ```
1. **Install dependencies**
   ```sh
   pnpm add wagmi viem@2.x @tanstack/react-query
   ```
   - If not using pnpm, double check your lock file ot ensure `v4.0.0-beta.12` is being used
1. **Run your app (command may vary depending on your scripts)**
   ```sh
   pnpm start
   ```
1. **Create a `config.ts` file that looks like this (`config.js` if not using typescript)**

   ```ts
   import { http, createConfig } from 'wagmi';
   import { baseSepolia } from 'wagmi/chains';
   import { coinbaseWallet } from 'wagmi/connectors';

   export const config = createConfig({
     chains: [baseSepolia],
     connectors: [
       coinbaseWallet({
         appName: 'Create Wagmi',
         appChainIds: [baseSepolia.id],
       }),
     ],
     transports: {
       [baseSepolia.id]: http(),
     },
   });
   ```

1. **Wrap your app in wagmi and query client providers**

   ```ts
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   import { WagmiProvider } from 'wagmi';
   import { config } from './config';
   import { AppContent } from './AppContent';

   const queryClient = new QueryClient();

   function App() {
     return (
       <WagmiProvider config={config}>
         <QueryClientProvider client={queryClient}>
           <AppContent />
         </QueryClientProvider>
       </WagmiProvider>
     );
   }
   ```

1. **Start using wagmi and Coinbase wallet v4 in your `AppContent` component.**

- Here's an example to get started.

  ```ts
  import React from 'react';
  import { useAccount, useConnect, useDisconnect } from 'wagmi';

  export function AppContent() {
    const account = useAccount();
    const { connectors, connect, status, error } = useConnect();
    const { disconnect } = useDisconnect();

    const connector = connectors[0];

    if (status === 'connecting') {
      return <div>Connecting...</div>;
    }

    if (error) {
      return <div>Error: {error.message}</div>;
    }

    if (account.status !== 'connected') {
      return (
        <button key={connector.uid} onClick={() => connect({ connector })} type="button">
          {connector.name}
        </button>
      );
    }

    return (
      <div>
        <h2>Account Info</h2>
        <div>
          status: {account.status}
          <br />
          addresses: {JSON.stringify(account.addresses)}
          <br />
          chainId: {account.chainId}
        </div>
        <button type="button" onClick={() => disconnect()}>
          Disconnect
        </button>
      </div>
    );
  }
  ```

7. **Click the Coinbase Wallet button to connect**

   - If you have the Coinbase wallet extension enabled, that will be the default connection method. Disable it to see the option to connect via smart wallet.
   - The Coinbase wallet popup will allow users to choose their connection method:
     - Create and connect a new smart wallet
     - Connect with an existing smart wallet via passkey
     - Connect with Coinbase Wallet mobile app via QR code scan
   - Once connected, your app will display the connected status, wallet address, the current chainId, and a disconnect button.

1. **Make more requests!**

   - You can find everything you need here: https://wagmi.sh/react/api/hooks
