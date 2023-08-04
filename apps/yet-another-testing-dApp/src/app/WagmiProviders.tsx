import { ReactNode } from "react";

import { useParams } from "next/navigation";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiConfig, configureChains, mainnet } from "wagmi";
import { publicProvider } from "wagmi/providers/public";

import { rainbowConfig } from "./libraries/rainbowkit/rainbowConfig";
import { wagmiConfig } from "./libraries/wagmi/wagmiConfig";
import { web3ModalConfig } from "./libraries/web3modal/web3ModalConfig";

const { chains } = configureChains([mainnet], [publicProvider()]);

export const WagmiProviders = ({ children }: { children: ReactNode }) => {
  const { libraries } = useParams();

  if (libraries === "wagmi") {
    return <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>;
  }

  if (libraries === "web3modal") {
    return <WagmiConfig config={web3ModalConfig}>{children}</WagmiConfig>;
  }

  return (
    <WagmiConfig config={rainbowConfig}>
      <RainbowKitProvider coolMode chains={chains}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
};
