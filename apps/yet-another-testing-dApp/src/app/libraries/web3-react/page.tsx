"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Flex,
  Select,
} from "@chakra-ui/react";

import { BadgeBug } from "@/app/components/Badges";
import { ButtonConnect } from "@/app/components/Buttons";
import { Results } from "@/app/components/Results";
import { Section } from "@/app/components/Section";
import { useApp } from "@/app/contexts/AppClient";
import { Disconnect } from "@/app/libraries/Disconnect";
import {
  CHAINS,
  getWeb3ReactAddChainParameters,
  unSupportedChainIds,
  whiteListedChainIds,
} from "@/app/utils/chains";
import { stringifyResults } from "@/app/utils/stringFormat";

import { web3Connectors } from "./web3Connectors";

const [coinbaseWallet, web3ReactHooks] = web3Connectors;

const { useAccounts, useIsActivating, useIsActive, useChainId } = web3ReactHooks;

function ChainSelect({
  chainIds,
  activeChainId,
  placeholder,
  isDisabled,
  switchChain,
}: {
  chainIds: number[];
  activeChainId: number;
  placeholder: string;
  isDisabled: boolean;
  switchChain: (chainId: number) => void;
}) {
  return (
    <Select
      value={activeChainId}
      placeholder={placeholder}
      onChange={(event) => {
        switchChain(Number(event.target.value));
      }}
      isDisabled={isDisabled}
    >
      {chainIds.map((chainId) => (
        <option key={chainId} value={chainId}>
          {CHAINS[chainId]?.name ?? chainId}
        </option>
      ))}
    </Select>
  );
}

const ChainWeb3React = () => {
  const { setChainId } = useApp();
  const accounts = useAccounts();
  const activeChainId = useChainId();
  const isLoading = useIsActivating();
  const [result, setResult] = useState(`Connected to chain ${activeChainId}`);
  const [desiredChainId, setDesiredChainId] = useState<number>();

  /**
   * When user connects eagerly (`desiredChainId` is undefined) or to the default chain (`desiredChainId` is -1),
   * update the `desiredChainId` value so that <select /> has the right selection.
   */
  useEffect(() => {
    if (activeChainId && !desiredChainId) {
      setDesiredChainId(activeChainId);
    }
  }, [desiredChainId, activeChainId]);

  const handleConnect = useCallback(async () => {
    try {
      if (
        !desiredChainId ||
        // If we're already connected to the desired chain, return
        desiredChainId === activeChainId ||
        // If they want to connect to the default chain and we're already connected, return
        (desiredChainId === undefined && activeChainId !== undefined)
      ) {
        return;
      }
      await coinbaseWallet.activate(getWeb3ReactAddChainParameters(desiredChainId));
      setResult(`Connected to chain ${desiredChainId}`);
      setChainId(`${desiredChainId}`);
    } catch (error) {
      setResult(JSON.stringify(error, null, 2));
      console.error(error);
    }
  }, [desiredChainId, activeChainId, setChainId]);

  const handleSwitchChain = useCallback((chainId: number) => {
    setDesiredChainId(chainId);
    setResult(`Switched to chain ${chainId}`);
  }, []);

  return (
    <Box pt={5}>
      <Section
        isHidden
        badge={
          <>
            <Box pb={3}>
              <BadgeBug />
            </Box>
            <Alert status="warning" size="xs" rounded="md" variant="subtle" alignItems="top">
              <AlertIcon mt={2} />
              <Box>
                <AlertTitle>Adding a new chain</AlertTitle>
                <AlertDescription fontSize="xs" lineHeight="1">
                  There is an issue with adding a new chain with the `activate(chainId)` method.
                  Currently, it does not reach the `wallet_addEthereumChain` call because the sdk
                  returns error code `-32603` when the code is looking for error code `4902`. This
                  is a bug in the `coinbase-wallet-sdk` package.
                </AlertDescription>
              </Box>
            </Alert>
          </>
        }
        title="coinbaseWallet.activate(chainId)"
        results={<Results result={result} />}
        refLink="https://docs.uniswap.org/sdk/web3-react/guides/switch-chains#switching-chains"
      >
        <Flex flex={1} justify="center" align="center" minH="200" direction="column">
          <Flex pb={3} flexDir="row" gap={3}>
            <ChainSelect
              activeChainId={desiredChainId || -1}
              switchChain={handleSwitchChain}
              chainIds={whiteListedChainIds}
              isDisabled={
                !!desiredChainId && unSupportedChainIds.includes(desiredChainId) && !accounts
              }
              placeholder="Whitelisted network"
            />
            <ChainSelect
              activeChainId={desiredChainId || -1}
              switchChain={handleSwitchChain}
              chainIds={unSupportedChainIds}
              isDisabled={
                !!desiredChainId && whiteListedChainIds.includes(desiredChainId) && !accounts
              }
              placeholder="Unsupported network"
            />
          </Flex>
          <Box pt={5}>
            <Button
              isDisabled={!desiredChainId}
              onClick={handleConnect}
              px={4}
              fontSize="sm"
              rounded="full"
              colorScheme="green"
              isLoading={isLoading}
            >
              {!!desiredChainId && CHAINS[desiredChainId]
                ? `Switch to ${CHAINS[desiredChainId].name} Network`
                : "Select a network first"}
            </Button>
          </Box>
        </Flex>
      </Section>
    </Box>
  );
};

const ConnectWeb3React = () => {
  const accounts = useAccounts();
  const isLoading = useIsActivating();
  const isConnected = useIsActive();
  const [result, setResult] = useState("");
  const activeChainId = useChainId();
  const { setConnected } = useApp();

  const handleConnect = useCallback(async () => {
    try {
      await coinbaseWallet.activate();
      setResult(stringifyResults(accounts));
      setConnected("web3-react");
    } catch (error) {
      setResult(stringifyResults(error));
    }
  }, [accounts, setConnected]);

  const handleDisconnect = useCallback(() => {
    coinbaseWallet.deactivate();
    setConnected("");
  }, [setConnected]);

  return (
    <>
      <Section
        title="activate()"
        results={<Results tag={`Chain ID: ${activeChainId}`} result={result} />}
        refLink="https://docs.uniswap.org/sdk/web3-react/guides/connectors#building-a-coinbase-wallet-connector"
      >
        <Flex flex={1} justify="center" align="center" minH="200">
          <ButtonConnect
            testId="web3-react"
            isConnected={isConnected}
            onClick={handleConnect}
            isLoading={isLoading}
          />
        </Flex>
      </Section>
      <Disconnect
        title="deactivate()"
        testId="web3-react"
        disconnect={handleDisconnect}
        account={accounts ? accounts[0] : ""}
      />
      <ChainWeb3React />
    </>
  );
};

export default ConnectWeb3React;
