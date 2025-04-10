import { Box, Card, CardBody, Code, Flex, Heading } from '@chakra-ui/react';
import React, { useEffect } from 'react';

import { ProviderConnectInfo } from 'viem';
import { useEIP1193Provider } from '../../context/EIP1193ProviderContextProvider';

export function EventListenersCard() {
  const [connect, setConnect] = React.useState<ProviderConnectInfo | null>(null);
  const [disconnect, setDisconnect] = React.useState<{ code: number; message: string } | null>(
    null
  );
  const [accountsChanged, setAccountsChanged] = React.useState<string[] | null>(null);
  const [chainChanged, setChainChanged] = React.useState<string | null>(null);

  const { provider } = useEIP1193Provider();

  useEffect(() => {
    if (!provider) return;
    provider.on('connect', (info) => {
      setConnect(info);
    });
    provider.on('disconnect', (error) => {
      setDisconnect({ code: error.code, message: error.message });
    });
    provider.on('accountsChanged', (accounts) => {
      setAccountsChanged(accounts);
    });
    provider.on('chainChanged', (chainId) => {
      setChainChanged(chainId);
    });

    return () => {
      if (!provider) return;
      // Clean up all listeners on unmount
      provider.removeAllListeners();
    };
  }, [provider]);

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
