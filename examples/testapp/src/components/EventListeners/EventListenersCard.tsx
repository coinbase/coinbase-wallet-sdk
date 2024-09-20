import { Box, Card, CardBody, Code, Flex, Heading } from '@chakra-ui/react';
import React, { useEffect } from 'react';

import { useCBWSDK } from '../../context/CBWSDKReactContextProvider';

export function EventListenersCard() {
  const [connect, setConnect] = React.useState<Record<string, unknown> | string | number | null>(
    null
  );
  const [disconnect, setDisconnect] = React.useState<
    Record<string, unknown> | string | number | null
  >(null);
  const [accountsChanged, setAccountsChanged] = React.useState<
    Record<string, unknown> | string | number | null
  >(null);
  const [chainChanged, setChainChanged] = React.useState<
    Record<string, unknown> | string | number | null
  >(null);
  const [message, setMessage] = React.useState<Record<string, unknown> | string | number | null>(
    null
  );

  const { provider } = useCBWSDK();

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
    provider.on('message', (message) => {
      setMessage(message);
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
              <Code>message</Code>
            </Heading>
          </Flex>
          {message && (
            <Code mt={2} as="pre" p={4} wordBreak="break-word" whiteSpace="pre-wrap" w="100%">
              {JSON.stringify(message, null, 2)}
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
