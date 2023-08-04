"use client";

import { useCallback, useState } from "react";

import { Flex } from "@chakra-ui/react";
import coinbaseWalletModule from "@web3-onboard/coinbase";
import Onboard from "@web3-onboard/core";

import { ButtonConnect } from "@/app/components/Buttons";
import { Results } from "@/app/components/Results";
import { Section } from "@/app/components/Section";
import { Todos } from "@/app/components/Todos";
import { useApp } from "@/app/contexts/AppClient";
import { Disconnect } from "@/app/libraries/Disconnect";
import { stringifyResults } from "@/app/utils/stringFormat";

const chains = [
  {
    id: 1,
    token: "ETH",
    label: "Ethereum Mainnet",
    rpcUrl: `https://rpc.flashbots.net`,
  },
  {
    id: 137,
    token: "MATIC",
    label: "Matic Mainnet",
    rpcUrl: "https://matic-mainnet.chainstacklabs.com",
  },
];

const TODO = ["onboard.state.get()", "onboard.state.select()", "onboard.setChain({ chainId })"];

// initialize the module with options
const coinbaseWalletSdk = coinbaseWalletModule({ darkMode: true });

const web3Onboard = Onboard({
  wallets: [coinbaseWalletSdk],
  chains,
});

const ConnectWeb3Onboard = () => {
  const { setConnected } = useApp();
  const [primaryWallet] = web3Onboard.state.get().wallets;
  const [results, setResults] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = useCallback(async () => {
    setIsLoading(true);
    try {
      const connectedWallets = await web3Onboard.connectWallet();
      setConnected("web3-onboard");
      setResults("See console for output");
      console.log("results: ", connectedWallets);
    } catch (error) {
      setResults(stringifyResults(error));
    } finally {
      setIsLoading(false);
    }
  }, [setConnected]);

  const handleDisconnect = useCallback(async () => {
    try {
      const result = await web3Onboard.disconnectWallet({ label: primaryWallet.label });
      setResults(stringifyResults(result));
    } catch (error) {
      console.error(error);
      setResults(stringifyResults(error));
    }
  }, [primaryWallet?.label]);

  return (
    <>
      <Section title="connectWallet()" results={<Results result={results} />}>
        <Flex flex={1} justify="center" align="center" minH="200">
          <ButtonConnect
            testId="web3-onboard"
            onClick={handleConnect}
            isLoading={isLoading}
            isConnected={!!primaryWallet?.label}
          />
        </Flex>
      </Section>
      <Disconnect
        title="disconnectWallet()"
        testId="web3-onboard"
        disconnect={handleDisconnect}
        account={primaryWallet?.accounts?.[0].address ?? ""}
      />
      <Todos items={TODO} />
    </>
  );
};

export default ConnectWeb3Onboard;
