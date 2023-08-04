"use client";

import { useCallback } from "react";

import { Flex } from "@chakra-ui/react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { ButtonConnect } from "@/app/components/Buttons";
import { Results } from "@/app/components/Results";
import { Section } from "@/app/components/Section";
import { Todos } from "@/app/components/Todos";
import { useApp } from "@/app/contexts/AppClient";
import { Disconnect } from "@/app/libraries/Disconnect";
import { stringifyResults } from "@/app/utils/stringFormat";

const ConnectWagmi = () => {
  const { setConnected, connected } = useApp();
  const { address, isConnected } = useAccount({
    onConnect: () => {
      setConnected("wagmi");
    },
    onDisconnect: () => {
      setConnected("");
    },
  });
  const { connect, connectors, error, isLoading } = useConnect();
  const { disconnect } = useDisconnect();
  const connectedAddress = connected === "wagmi" && address ? address : null;

  const handleConnect = useCallback(async () => {
    connect({ connector: connectors[0] });
  }, [connect, connectors]);

  return (
    <>
      <Section
        title="connect({ connector })"
        results={<Results result={connectedAddress ?? stringifyResults(error)} />}
      >
        <Flex flex={1} justify="center" align="center" minH="200">
          <ButtonConnect
            testId="wagmi"
            onClick={handleConnect}
            isLoading={isLoading}
            isConnected={isConnected}
          />
        </Flex>
      </Section>
      <Disconnect
        testId="wagmi"
        title="disconnect()"
        disconnect={disconnect}
        account={isConnected}
      />
      <Todos items={["TODO"]} />
    </>
  );
};

export default ConnectWagmi;
