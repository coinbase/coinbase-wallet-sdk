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

import { sdkVersions, useCBWSDK } from '../context/CBWSDKProvider';

type LayoutProps = {
  children: React.ReactNode;
};

export const WIDTH_2XL = '1536px';

export function Layout({ children }: LayoutProps) {
  const { sdk, sdkVersion, setSDKVersion } = useCBWSDK();

  const handleClockDocs = () => {
    window.open('https://cbdev.io/walletstart', '_blank');
  };

  const handleDisconnect = () => {
    if (sdk) {
      sdk.disconnect();
    }
  };

  return (
    <Box minH="100vh" bg="blackAlpha.100">
      <Box as="header" shadow="lg" py={6} bg="blackAlpha.900" color="whiteAlpha.900">
        <Container maxW={WIDTH_2XL}>
          <Flex justifyContent="space-between" alignItems="center">
            <Heading>Coinbase Wallet SDK - Playground</Heading>
            <Flex justifyContent="space-between" alignItems="center" gap={4}>
              <Button onClick={handleClockDocs}>Docs</Button>
              <Menu>
                <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                  {`SDK: ${sdkVersion}`}
                </MenuButton>
                <MenuList>
                  {sdkVersions.map((version) => (
                    <MenuItem
                      color={'MenuText'}
                      key={version}
                      icon={version === sdkVersion ? <CheckIcon /> : null}
                      onClick={() => setSDKVersion(version)}
                    >
                      {version}
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
