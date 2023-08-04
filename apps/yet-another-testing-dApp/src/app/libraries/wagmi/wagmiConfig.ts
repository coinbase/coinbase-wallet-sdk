import { configureChains, createConfig, mainnet } from "wagmi";
import { CoinbaseWalletConnector } from "wagmi/connectors/coinbaseWallet";
import { publicProvider } from "wagmi/providers/public";

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet],
  [publicProvider()],
);

export const wagmiConfig = createConfig({
  connectors: [
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: "Yet Another Test dApp",
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});
