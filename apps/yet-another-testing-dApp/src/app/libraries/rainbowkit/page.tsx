"use client";

import { Flex } from "@chakra-ui/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useAccount, useConnect } from "wagmi";

import { Results } from "@/app/components/Results";
import { Section } from "@/app/components/Section";
import { useApp } from "@/app/contexts/AppClient";
import { stringifyResults } from "@/app/utils/stringFormat";

export default function ConnectRainbowKit() {
  const { setConnected } = useApp();
  const { address } = useAccount({
    onConnect: () => {
      setConnected("wagmi");
    },
    onDisconnect: () => {
      setConnected("");
    },
  });
  const { error } = useConnect();

  return (
    <>
      <Section
        title="<ConnectButton />"
        results={<Results result={address ?? stringifyResults(error)} />}
      >
        <Flex flex={1} justify="center" align="center" minH="200">
          <ConnectButton />
        </Flex>
      </Section>
    </>
  );
}
