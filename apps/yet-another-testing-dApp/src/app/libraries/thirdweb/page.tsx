"use client";

import { useCallback, useState } from "react";

import { Flex } from "@chakra-ui/react";
import { CoinbaseWallet } from "@thirdweb-dev/wallets";

import { ButtonConnect } from "@/app/components/Buttons";
import { Results } from "@/app/components/Results";
import { Section } from "@/app/components/Section";
import { useApp } from "@/app/contexts/AppClient";
import { Disconnect } from "@/app/libraries/Disconnect";
import { stringifyResults } from "@/app/utils/stringFormat";

const coinbaseWallet = new CoinbaseWallet();

const ConnectThirdWeb = () => {
  const { setConnected } = useApp();
  const [results, setResults] = useState("");
  const [status, setStatus] = useState("");

  const handleConnect = useCallback(async () => {
    setStatus("loading");
    try {
      const walletAddress = await coinbaseWallet.connect();
      setResults(stringifyResults(walletAddress));
      setStatus("connected");
      setConnected("thirdweb");
    } catch (error) {
      setStatus("");
      setConnected("");
      setResults(stringifyResults(error));
    }
  }, [setConnected]);

  const handleDisconnect = useCallback(async () => {
    setStatus("");
    try {
      const walletAddress = await coinbaseWallet.disconnect();
      setResults(JSON.stringify(walletAddress, null, 2));
      console.log(walletAddress);
      setConnected("");
    } catch (error) {
      setResults(JSON.stringify(error, null, 2));
      console.error(error);
    }
  }, [setConnected]);

  return (
    <>
      <Section title="connect()" results={<Results result={results} />}>
        <Flex flex={1} justify="center" align="center" minH="200">
          <ButtonConnect
            testId="thirdweb"
            onClick={handleConnect}
            isLoading={status === "loading"}
            isConnected={status === "connected"}
          />
        </Flex>
      </Section>
      <Disconnect
        title="disconnect()"
        testId="thirdweb"
        disconnect={handleDisconnect}
        account={status === "connected" ? results : ""}
      />
    </>
  );
};

export default ConnectThirdWeb;
