"use client";

import { Flex } from "@chakra-ui/react";
import { EthereumClient } from "@web3modal/ethereum";
import { Web3Button, Web3Modal } from "@web3modal/react";
import { useAccount, useConnect } from "wagmi";

import { Results } from "@/app/components/Results";
import { Section } from "@/app/components/Section";
import { useApp } from "@/app/contexts/AppClient";
import { stringifyResults } from "@/app/utils/stringFormat";
import { projectId } from "@/app/utils/walletConnectProjectId";

import { chains, web3ModalConfig } from "./web3ModalConfig";

const ethereumClient = new EthereumClient(web3ModalConfig, chains);

export default function ConnectWeb3Modal() {
  const { setConnected } = useApp();
  const { address } = useAccount({
    onConnect: () => {
      setConnected("web3modal");
    },
    onDisconnect: () => {
      setConnected("");
    },
  });
  const { error } = useConnect();

  return (
    <>
      <Section
        title="<Web3Button />"
        results={<Results result={address ?? stringifyResults(error)} />}
      >
        <Flex flex={1} justify="center" align="center" minH="200">
          <Web3Button />
        </Flex>
      </Section>
      <Web3Modal projectId={projectId} ethereumClient={ethereumClient} />
    </>
  );
}
