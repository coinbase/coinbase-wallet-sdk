import { CheckIcon, ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
} from '@chakra-ui/react';

import { useCBWSDK } from '../context/CBWSDKReactContextProvider';

type LayoutProps = {
  children: React.ReactNode;
};

export const WIDTH_2XL = '1536px';

export function Layout({ children }: LayoutProps) {
  const { provider, connectionPreference, setPreference } = useCBWSDK();

  const handleDisconnect = () => {
    if (provider) {
      provider.disconnect();
    }
  };

  return (
    <Box minH="100vh" bg="blackAlpha.100">
      <Box as="header" shadow="lg" py={6} bg="blackAlpha.900" color="whiteAlpha.900">
        <Container maxW={WIDTH_2XL}>
          <Flex justifyContent="space-between" alignItems="center">
            <Heading>Coinbase Wallet SDK - Playground</Heading>
            <Flex justifyContent="space-between" alignItems="center" gap={4}>
              <Menu>
                <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                  {`Mode: ${connectionPreference}`}
                </MenuButton>
                <MenuList>
                  {['default', 'embedded'].map((preference) => (
                    <MenuItem
                      color={'MenuText'}
                      key={preference}
                      icon={preference === connectionPreference ? <CheckIcon /> : null}
                      onClick={() => setPreference(preference)}
                    >
                      {preference}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
              {/* TODO: There is an issue where `this` is undefined within the sdk instance. */}
              <Button onClick={handleDisconnect}>Disconnect</Button>
            </Flex>
          </Flex>
        </Container>
      </Box>
      <Flex flex={1} as="main" mt={6}>
        {children}
      </Flex>
    </Box>
  );
}
