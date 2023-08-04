"use client";

import { useCallback, useState } from "react";

import { Button, Flex } from "@chakra-ui/react";
import { AddEthereumChainParameter } from "viem/dist/types";

import { Results } from "@/app/components/Results";
import { Section } from "@/app/components/Section";
import { useApp } from "@/app/contexts/AppClient";
import { getAddChainParameters } from "@/app/utils/chains";
import { UNSUPPORTED_CHAINS } from "@/app/utils/chains";
import { windowEthereum } from "@/app/utils/windowEthereum";

const unSupportedChainIds = Object.keys(UNSUPPORTED_CHAINS).map(Number);
export const celoMainnetChainId = unSupportedChainIds[0];

/**
 * EIP-3085
 *
 * `wallet_addEthereumChain`
 */
export const AddEthereumChain = () => {
  const [results, setResults] = useState("");
  const { setChainId } = useApp();

  const handleAddEthereumChain = useCallback(async () => {
    try {
      const result = await windowEthereum?.request({
        method: "wallet_addEthereumChain",
        params: [getAddChainParameters(celoMainnetChainId) as AddEthereumChainParameter],
      });
      setResults(JSON.stringify(result, null, 2));
      setChainId(celoMainnetChainId.toString());
      console.log(result);
    } catch (error) {
      setResults(JSON.stringify(error, null, 2));
      console.error(error);
    }
  }, [setChainId]);

  return (
    <Section
      title="wallet_addEthereumChain"
      results={<Results result={results} />}
      refLink="https://eips.ethereum.org/EIPS/eip-3085"
    >
      <Flex flex={1} justify="center" align="center" minH="200">
        <Button onClick={handleAddEthereumChain} fontSize="sm" rounded="full" colorScheme="teal">
          Add Celo Mainnet
        </Button>
      </Flex>
    </Section>
  );
};
