import { Box, Button, Container, Flex, Heading } from '@chakra-ui/react';

import { useCBWSDK } from '../context/CBWSDKProvider';

type LayoutProps = {
  children: React.ReactNode;
};

export function Layout({ children }: LayoutProps) {
  const { sdk } = useCBWSDK();
  const handleDisconnect = () => {
    if (sdk) {
      sdk.disconnect();
    }
  };
  return (
    <Box minH="100vh" bg="blackAlpha.100">
      <Box as="header" shadow="lg" py={6} bg="blackAlpha.900" color="whiteAlpha.900">
        <Container maxW="container.xl">
          <Flex justifyContent="space-between" alignItems="center">
            <Heading>Coinbase Wallet SDK - Playground</Heading>
            {/* TODO: There is an issue where `this` is undefined within the sdk instance. */}
            <Button onClick={handleDisconnect}>Disconnect</Button>
          </Flex>
        </Container>
      </Box>
      <Flex flex={1} as="main" mt={6}>
        {children}
      </Flex>
    </Box>
  );
}
