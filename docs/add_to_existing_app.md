# Add to an existing app

1. Force wagmi to use Coinbase wallet SDKv4 beta by adding this to your `package.json`
   ```ts
   "resolutions": {
       "@coinbase/wallet-sdk": "4.0.0-beta.12"
   },
   ```
1. Install dependencies
   ```sh
   pnpm add wagmi viem@2.x @tanstack/react-query
   ```
   - Double check your lock file ot ensure `v4.0.0-beta.12` is being used
1. Run your app (command may vary depending on your scripts)
   ```sh
   pnpm start
   ```
1. Create a `config.ts` file that looks like this

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

1. Wrap your app in wagmi and query client providers

   ```ts
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   import { WagmiProvider } from 'wagmi';
   import { config } from './config';
   import { AppContent } from './AppContent';

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

1. Start using wagmi and Coinbase wallet v4 in AppContent.

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

7. Click the Coinbase Wallet button to connect

8. Make more requests!

- See all wagmi hooks with examples here: https://wagmi.sh/react/api/hooks
