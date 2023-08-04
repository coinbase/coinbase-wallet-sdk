import { connectorsForWallets, getDefaultWallets } from "@rainbow-me/rainbowkit";
import {
  argentWallet,
  coinbaseWallet,
  injectedWallet,
  ledgerWallet,
  metaMaskWallet,
  rainbowWallet,
  trustWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig } from "wagmi";
import { configureChains, mainnet } from "wagmi";
import { arbitrum, optimism, polygon, zora } from "wagmi/chains";
import { publicProvider } from "wagmi/providers/public";

import { projectId } from "@/app/utils/walletConnectProjectId";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet, polygon, optimism, arbitrum, zora],
  [publicProvider()],
);

const { wallets: otherWallets } = getDefaultWallets({
  appName: "My RainbowKit App",
  projectId,
  chains,
});

const connectors = connectorsForWallets([
  {
    groupName: "Recommended",
    wallets: [coinbaseWallet({ appName: "YATA", chains })],
  },
  {
    groupName: "Other",
    wallets: [
      // injectedWallet({ chains }),
      // rainbowWallet({ projectId, chains }),
      // metaMaskWallet({ projectId, chains }),
      walletConnectWallet({ projectId, chains }),
      argentWallet({ projectId, chains }),
      trustWallet({ projectId, chains }),
      ledgerWallet({ projectId, chains }),
    ],
  },
]);

export const rainbowConfig = createConfig({
  connectors,
  publicClient,
  webSocketPublicClient,
});
