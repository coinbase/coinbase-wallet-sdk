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
import NextLink from 'next/link';
import React, { useMemo } from 'react';
import { useConfig } from '../context/ConfigContextProvider';
import { scwUrls } from '../store/config';
import { cleanupSDKLocalStorage } from '../utils/cleanupSDKLocalStorage';
type LayoutProps = {
  children: React.ReactNode;
};

export const WIDTH_2XL = '1536px';

const PAGES = [
  '/',
  '/add-sub-account',
  '/import-sub-account',
  '/auto-sub-account',
  '/spend-permission',
  '/payment',
  '/pay-playground',
  '/subscribe-playground',
  '/prolink-playground',
  '/solana',
  '/e2e-test',
];

export function Layout({ children }: LayoutProps) {
  const { scwUrl, setScwUrlAndSave } = useConfig();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const isSmallScreen = useBreakpointValue({ base: true, xl: false });

  const handleReset = async () => {
    localStorage.clear();
    window.location.reload();
  };

  const configs = useMemo(() => {
    return (
      <>
        <Menu>
          <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
            {`Env: ${scwUrl}`}
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
    );
  }, [scwUrl, setScwUrlAndSave]);

  const handleGoToHome = () => {
    window.location.href = '/';
  };

  const pages = useMemo(() => {
    return (
      <Menu>
        <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
          Pages
        </MenuButton>
        <MenuList>
          {PAGES.map((page) => (
            <MenuItem
              key={page}
              as={NextLink}
              href={page}
              color={'MenuText'}
              onClick={cleanupSDKLocalStorage}
            >
              {page}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    );
  }, []);

  return (
    <Box minH="100vh" bg="blackAlpha.100">
      <Box as="header" shadow="lg" py={6} bg="blackAlpha.900" color="whiteAlpha.900">
        <Container maxW={WIDTH_2XL}>
          <Flex
            justifyContent="space-between"
            alignItems="center"
            direction={isSmallScreen ? 'column' : 'row'}
            gap={2}
          >
            <Heading onClick={handleGoToHome}>Base Account SDK</Heading>
            <Flex justifyContent="space-between" alignItems="center" gap={4}>
              {isSmallScreen ? (
                <Button colorScheme="telegram" onClick={onOpen}>
                  Config
                </Button>
              ) : (
                configs
              )}
              {pages}
              <Button colorScheme="red" onClick={handleReset}>
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
