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
import latestPkgJson from '@coinbase/wallet-sdk/package.json';
import { useMemo } from 'react';

import { options, scwUrls, sdkVersions, useCBWSDK } from '../context/CBWSDKReactContextProvider';

type LayoutProps = {
  children: React.ReactNode;
};

export const WIDTH_2XL = '1536px';

export function Layout({ children }: LayoutProps) {
  const { provider, option, setPreference, sdkVersion, setSDKVersion, scwUrl, setScwUrlAndSave } =
    useCBWSDK();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const isSmallScreen = useBreakpointValue({ base: true, xl: false });

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
        {(sdkVersion === 'HEAD' || sdkVersion === latestPkgJson.version) && (
          <>
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                {`Option: ${option}`}
              </MenuButton>
              <MenuList>
                {options.map((b) => (
                  <MenuItem
                    color={'MenuText'}
                    key={b.toString()}
                    icon={b === option ? <CheckIcon /> : null}
                    onClick={() => setPreference(b)}
                  >
                    {b.toString()}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>

            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                {`SW URL: ${scwUrl}`}
              </MenuButton>
              <MenuList>
                {scwUrls.map((url) => (
                  <MenuItem
                    color={'MenuText'}
                    key={url}
                    icon={url === scwUrl ? <CheckIcon /> : null}
                    onClick={() => setScwUrlAndSave(url)}
                  >
                    {url.toString()}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </>
        )}
      </>
    );
  }, [sdkVersion, option, setPreference, setSDKVersion, scwUrl, setScwUrlAndSave]);

  return (
    <Box minH="100vh" bg="blackAlpha.100">
      <Box as="header" shadow="lg" py={6} bg="blackAlpha.900" color="whiteAlpha.900">
        <Container maxW={WIDTH_2XL}>
          <Flex justifyContent="space-between" alignItems="center">
            <Heading>Coinbase Wallet SDK</Heading>
            <Flex justifyContent="space-between" alignItems="center" gap={4}>
              {isSmallScreen ? (
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
      {isSmallScreen && (
        <Drawer placement="top" onClose={onClose} isOpen={isOpen}>
          <DrawerOverlay />
          <DrawerContent>
            <DrawerHeader borderBottomWidth="1px">Config</DrawerHeader>
            <DrawerBody>
              <Flex
                direction="column"
                justifyContent="flex-start"
                alignItems="flex-start"
                gap={4}
                paddingY={2}
              >
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
