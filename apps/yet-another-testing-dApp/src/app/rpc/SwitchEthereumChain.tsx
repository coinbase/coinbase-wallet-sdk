"use client";

import { useCallback, useState } from "react";

import { Button, Flex } from "@chakra-ui/react";

import { DropdownChains } from "@/app/components/DropdownChains";
import { Results } from "@/app/components/Results";
import { Section } from "@/app/components/Section";
import { useApp } from "@/app/contexts/AppClient";
import { getAddChainParameters } from "@/app/utils/chains";
import { stringifyResults } from "@/app/utils/stringFormat";
import { windowEthereum } from "@/app/utils/windowEthereum";

/**
 * EIP-3326
 *
 * `wallet_switchEthereumChain`
 */
export const SwitchEthereumChain = () => {
  const [results, setResults] = useState("");
  const [selected, setSelected] = useState<number | undefined>();
  const { setChainId } = useApp();

  const handleSwitchEthereumChain = useCallback(async () => {
    try {
      const result = await windowEthereum?.request({
        method: "wallet_switchEthereumChain",
        params: [getAddChainParameters(selected as number)],
      });
      setResults(stringifyResults(result));
      setChainId(selected?.toString() || "");
    } catch (error) {
      setResults(stringifyResults(error));
    }
  }, [selected, setChainId]);

  return (
    <Section
      title="wallet_switchEthereumChain"
      results={<Results result={results} />}
      refLink="https://eips.ethereum.org/EIPS/eip-3326"
    >
      <Flex direction="column" gap={10}>
        <DropdownChains onSelect={setSelected} selected={selected} />
        <Button
          isDisabled={!selected}
          onClick={handleSwitchEthereumChain}
          fontSize="sm"
          rounded="full"
          colorScheme="teal"
        >
          Switch to Chain Id: {selected}
        </Button>
      </Flex>
    </Section>
  );
};
