"use client";

import { useCallback, useState } from "react";

import { Box, Button, Code, Flex, Link, Text } from "@chakra-ui/react";
import CoinbaseWalletSDK, { CoinbaseWalletProvider } from "@coinbase/wallet-sdk";

import { BadgeBug, BadgeDeprecated } from "@/app/components/Badges";
import { ButtonConnect } from "@/app/components/Buttons";
import { Results } from "@/app/components/Results";
import { Section } from "@/app/components/Section";
import { Todos } from "@/app/components/Todos";
import { useApp } from "@/app/contexts/AppClient";
import { useOnMount } from "@/app/hooks/useOnMount";
import { Disconnect } from "@/app/libraries/Disconnect";
import { MAINNET_CHAINS, defaultChainId } from "@/app/utils/chains";
import { stringifyResults } from "@/app/utils/stringFormat";
import { coinbaseProvider } from "@/app/utils/windowEthereum";

const TODO = ["getQrUrl", "getCoinbaseWalletLogo", "walletExtension", "isCipherProvider"];

export default function ConnectCoinbaseWalletSDK() {
  const { account, setConnected } = useApp();
  const [provider, setProvider] = useState<CoinbaseWalletProvider>();

  useOnMount(() => {
    const sdk = new CoinbaseWalletSDK({
      appName: "Testing Dapp",
      darkMode: true,
    });

    const cbwProvider = sdk.makeWeb3Provider(
      MAINNET_CHAINS[defaultChainId].urls[0],
      defaultChainId,
    );
    setProvider(cbwProvider);
    console.info(`window.ethereum: `, window.ethereum);
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const handleConnect = useCallback(async () => {
    if (!provider) return;

    setIsLoading(true);
    // Get accounts for connected wallet
    try {
      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      setResult(JSON.stringify(accounts, null, 2));
      setConnected("coinbase-wallet-sdk");
      console.log("eth_requestAccounts: ", accounts);
    } catch (error) {
      setResult(JSON.stringify(error, null, 2));
      setIsLoading(false);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [provider, setConnected]);

  const handleEnable = useCallback(async () => {
    if (!provider) return;
    setIsLoading(true);
    try {
      const accounts: string[] = await provider.enable();
      setResult(stringifyResults(accounts));
    } catch (error) {
      setResult(stringifyResults(error));
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  }, [provider]);

  const handleClose = useCallback(async () => {
    try {
      await coinbaseProvider?.close();
      setConnected("");
    } catch (error) {
      setError(stringifyResults(error));
    }
  }, [setConnected]);

  const handleDisconnect = useCallback(async () => {
    try {
      coinbaseProvider?.disconnect();
      setConnected("");
    } catch (error) {
      setError(stringifyResults(error));
    }
  }, [setConnected]);

  return (
    <>
      <Section
        title="eth_requestAccounts"
        refLink="https://eips.ethereum.org/EIPS/eip-1102"
        results={<Results result={result} />}
      >
        <Flex flex={1} justify="center" align="center" minH="200">
          <ButtonConnect
            testId="coinbase-wallet-sdk"
            onClick={handleConnect}
            isLoading={isLoading}
            isConnected={!!account}
          />
        </Flex>
      </Section>
      <Section
        title="enable()"
        results={<Results result={result} />}
        isHidden
        badge={
          <Flex flexDirection="row" justifyContent="space-between" alignItems="center">
            <BadgeDeprecated as="div" />
            <Flex gap={2} alignItems="top" fontSize="10px">
              <Text>See details:</Text>
              <Box>
                <Link color="GrayText" isExternal>
                  https://eips.ethereum.org/EIPS/eip-1102#providerenable-deprecated
                </Link>
                <Text>
                  Use <Code fontSize="10px">eth_requestAccounts</Code>.
                </Text>
              </Box>
            </Flex>
          </Flex>
        }
      >
        <Flex flex={1} justify="center" align="center" minH="200">
          <Button
            colorScheme="teal"
            onClick={handleEnable}
            isLoading={isLoading}
            isDisabled={!!account}
            size="sm"
          >
            Connect Wallet
          </Button>
        </Flex>
      </Section>
      <Disconnect
        title="close()"
        disconnect={handleClose}
        error={error}
        description="https://docs.cloud.coinbase.com/wallet-sdk/docs/disconnecting-links"
        account={account}
        testId="coinbase-wallet-sdk"
      />
      <Disconnect
        isHidden
        badge={<BadgeBug />}
        title="disconnect()"
        error={error}
        disconnect={handleDisconnect}
        description="https://docs.cloud.coinbase.com/wallet-sdk/docs/disconnecting-links"
        account={account}
        testId="coinbase-wallet-sdk-error"
      />
      <Todos items={TODO} />
    </>
  );
}
