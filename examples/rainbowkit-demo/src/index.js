import { StrictMode } from "react";
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from "@chakra-ui/react";
import {
  getDefaultWallets,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { 
  WagmiConfig, 
  createClient, 
  configureChains
} from "wagmi";
import { arbitrum, avalanche, bsc, fantom, goerli, mainnet, optimism, polygon, sepolia } from 'wagmi/chains';
import { infuraProvider } from 'wagmi/providers/infura'
import { publicProvider } from 'wagmi/providers/public'
import App from "./App";

// API key for Ethereum node
// Two popular services are Infura (infura.io) and Alchemy (alchemy.com)
const infuraId = process.env.INFURA_ID;

// Configure chains for connectors to support
const { chains, provider } = configureChains(
  [ arbitrum, avalanche, bsc, fantom, goerli, mainnet, optimism, polygon, sepolia ],
  [
    infuraProvider({ infuraId }),
    publicProvider(),
  ]
);

export const { connectors } = getDefaultWallets({
  appName: 'RainbowKit Demo',
  chains
});

const client = createClient({
  autoConnect: true,
  connectors,
  provider
});

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);
root.render(
  <StrictMode>
    <ChakraProvider>
      <WagmiConfig client={client}>
        <RainbowKitProvider chains={chains}>
          <App />
        </RainbowKitProvider>
      </WagmiConfig>
    </ChakraProvider>
  </StrictMode>
);
