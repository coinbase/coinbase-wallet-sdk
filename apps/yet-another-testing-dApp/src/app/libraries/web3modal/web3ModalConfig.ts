import { w3mConnectors } from "@web3modal/ethereum";
import { configureChains, createConfig, mainnet } from "wagmi";
import { optimism, polygon } from "wagmi/chains";
import { CoinbaseWalletConnector } from "wagmi/connectors/coinbaseWallet";
import { publicProvider } from "wagmi/providers/public";

import { projectId } from "@/app/utils/walletConnectProjectId";

export const chains = [mainnet, polygon, optimism];
const { publicClient } = configureChains(chains, [publicProvider()]);

export const web3ModalConfig = createConfig({
  connectors: [
    ...w3mConnectors({ projectId, chains }),
    new CoinbaseWalletConnector({ chains, options: { appName: "YATA" } }),
  ],
  publicClient,
});
