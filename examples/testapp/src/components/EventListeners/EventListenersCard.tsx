import { Box, Card, CardBody, Code, Flex, Heading } from '@chakra-ui/react';
import React, { useCallback, useEffect } from 'react';

import { ProviderConnectInfo } from 'viem';
import { useEIP1193Provider } from '../../context/EIP1193ProviderContextProvider';

export function EventListenersCard() {
  const [connect, setConnect] = React.useState<ProviderConnectInfo | null>(null);
  const [disconnect, setDisconnect] = React.useState<{
    code: number;
    message: string;
  } | null>(null);
  const [accountsChanged, setAccountsChanged] = React.useState<string[] | null>(null);
  const [chainChanged, setChainChanged] = React.useState<string | null>(null);

  const { provider } = useEIP1193Provider();

  const handleConnect = useCallback((info: ProviderConnectInfo) => {
    setConnect(info);
  }, []);

  const handleDisconnect = useCallback((error: { code: number; message: string }) => {
    setDisconnect({ code: error.code, message: error.message });
  }, []);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    setAccountsChanged(accounts);
  }, []);

  const handleChainChanged = useCallback((chainId: string) => {
    setChainChanged(chainId);
  }, []);

  useEffect(() => {
    if (!provider) return;
    provider?.on('connect', handleConnect);
    provider?.on('disconnect', handleDisconnect);
    provider?.on('accountsChanged', handleAccountsChanged);
    provider?.on('chainChanged', handleChainChanged);

    return () => {
      if (!provider) return;
      // Clean up all listeners on unmount
      provider?.removeListener('connect', handleConnect);
      provider?.removeListener('disconnect', handleDisconnect);
      provider?.removeListener('accountsChanged', handleAccountsChanged);
      provider?.removeListener('chainChanged', handleChainChanged);
    };
  }, [provider, handleConnect, handleDisconnect, handleAccountsChanged, handleChainChanged]);

  return (
    <Card shadow="lg">
      <CardBody>
        <Box>
          <Flex align="center" justify="space-between">
            <Heading as="h2" size="lg">
              <Code>accountsChanged</Code>
            </Heading>
          </Flex>
          {accountsChanged && (
            <Code mt={2} as="pre" p={4} wordBreak="break-word" whiteSpace="pre-wrap" w="100%">
              {JSON.stringify(accountsChanged, null, 2)}
            </Code>
          )}
        </Box>
        <Box>
          <Flex align="center" justify="space-between">
            <Heading as="h2" size="lg">
              <Code>chainChanged</Code>
            </Heading>
          </Flex>
          {chainChanged && (
            <Code mt={2} as="pre" p={4} wordBreak="break-word" whiteSpace="pre-wrap" w="100%">
              {JSON.stringify(chainChanged, null, 2)}
            </Code>
          )}
        </Box>
        <Box>
          <Flex align="center" justify="space-between">
            <Heading as="h2" size="lg">
              <Code>connect</Code>
            </Heading>
          </Flex>
          {connect && (
            <Code mt={2} as="pre" p={4} wordBreak="break-word" whiteSpace="pre-wrap" w="100%">
              {JSON.stringify(connect, null, 2)}
            </Code>
          )}
        </Box>
        <Box>
          <Flex align="center" justify="space-between">
            <Heading as="h2" size="lg">
              <Code>disconnect</Code>
            </Heading>
          </Flex>
          {disconnect && (
            <Code mt={2} as="pre" p={4} wordBreak="break-word" whiteSpace="pre-wrap" w="100%">
              {JSON.stringify(disconnect, null, 2)}
            </Code>
          )}
        </Box>
      </CardBody>
    </Card>
  );
}
