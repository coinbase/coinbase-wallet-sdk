import { CheckIcon, ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Container,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useBreakpointValue,
  useDisclosure,
} from '@chakra-ui/react';
import { useMemo } from 'react';

import { sdkVersions, useCBWSDK } from '../context/CBWSDKReactContextProvider';

type LayoutProps = {
  children: React.ReactNode;
};

export const WIDTH_2XL = '1536px';

export function Layout({ children }: LayoutProps) {
  const { provider, smartWalletOnly, setPreference, sdkVersion, setSDKVersion } = useCBWSDK();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const handleClockDocs = () => {
    window.open('https://docs.cloud.coinbase.com/wallet-sdk/docs/welcome', '_blank');
  };

  const handleDisconnect = async () => {
    if (provider) {
      await provider.disconnect();
    }
    localStorage.clear();
  };

  const configs = useMemo(() => {
    return (
      <>
        <Menu>
          <MenuButton colorScheme="telegram" as={Button} rightIcon={<ChevronDownIcon />}>
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
        {sdkVersion === '4.0' && (
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
              {`smartWalletOnly: ${smartWalletOnly}`}
            </MenuButton>
            <MenuList>
              {[true, false].map((b) => (
                <MenuItem
                  color={'MenuText'}
                  key={b.toString()}
                  icon={b === smartWalletOnly ? <CheckIcon /> : null}
                  onClick={() => setPreference(b)}
                >
                  {b.toString()}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        )}
      </>
    );
  }, [sdkVersion, smartWalletOnly, setPreference, setSDKVersion]);

  return (
    <Box minH="100vh" bg="blackAlpha.100">
      <Box as="header" shadow="lg" py={6} bg="blackAlpha.900" color="whiteAlpha.900">
        <Container maxW={WIDTH_2XL}>
          <Flex justifyContent="space-between" alignItems="center">
            <Heading>Coinbase Wallet SDK</Heading>
            <Flex justifyContent="space-between" alignItems="center" gap={4}>
              {isMobile ? (
                <Button colorScheme="telegram" onClick={onOpen}>
                  Config
                </Button>
              ) : (
                configs
              )}
              <Button onClick={handleClockDocs}>Docs</Button>
              {/* TODO: There is an issue where `this` is undefined within the sdk instance. */}
              <Button colorScheme="red" onClick={handleDisconnect}>
                Reset
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>
      {isMobile && (
        <Drawer placement="top" onClose={onClose} isOpen={isOpen}>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerHeader borderBottomWidth="1px">Basic Drawer</DrawerHeader>
            <DrawerBody>
              <Flex justifyContent="flex-start" alignItems="center" gap={4} paddingY={2}>
                {configs}
              </Flex>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      )}
      <Flex flex={1} as="main" mt={6}>
        {children}
      </Flex>
    </Box>
  );
}
