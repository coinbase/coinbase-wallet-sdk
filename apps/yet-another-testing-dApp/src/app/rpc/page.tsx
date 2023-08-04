"use client";

import { useCallback, useState } from "react";

import { Flex } from "@chakra-ui/react";

import { ButtonConnect } from "@/app/components/Buttons";
import { Category } from "@/app/components/Category";
import { Results } from "@/app/components/Results";
import { Section } from "@/app/components/Section";
import { useApp } from "@/app/contexts/AppClient";
import { windowEthereum } from "@/app/utils/windowEthereum";

/* PLOP: adds RPC import */
import { AddEthereumChain } from "./AddEthereumChain";
import { RequestPermissions } from "./RequestPermissions";
import { SwitchEthereumChain } from "./SwitchEthereumChain";

export default function RpcMethods() {
  const { setConnected, account } = useApp();
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = useCallback(async () => {
    if (!windowEthereum) return;

    setIsLoading(true);
    // Get accounts for connected wallet
    try {
      const accounts: string[] = await windowEthereum.request({ method: "eth_requestAccounts" });
      setConnected("Injected Provider: window.ethereum");
      setResult(JSON.stringify(accounts, null, 2));
    } catch (error) {
      setResult(JSON.stringify(error, null, 2));
      setIsLoading(false);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [setConnected]);

  return (
    <Category title="RPC Methods">
      <Section
        title="eth_requestAccounts"
        results={<Results result={result} />}
        refLink="https://eips.ethereum.org/EIPS/eip-1102"
      >
        <Flex flex={1} justify="center" align="center" minH="200">
          <ButtonConnect isConnected={!!account} onClick={handleConnect} isLoading={isLoading} />
        </Flex>
      </Section>
      {/* PLOP: adds RPC component */}
      <AddEthereumChain />
      <SwitchEthereumChain />
      <RequestPermissions />
    </Category>
  );
}
