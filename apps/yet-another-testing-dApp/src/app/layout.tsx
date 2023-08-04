"use client";

import React, { ReactNode } from "react";

import { useColorModeValue, Container, Stack, Box, Flex, Link } from "@chakra-ui/react";
import { Web3ReactProvider } from "@web3-react/core";

import { WagmiProviders } from "@/app/WagmiProviders";
import { SidebarContent } from "@/app/components/SidebarContent";
import { AppProvider } from "@/app/contexts/AppClient";

import { ChakraProviders } from "./ChakraProviders";
import "./globals.css";
import { web3Connectors } from "./libraries/web3-react/web3Connectors";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US">
      <head>
        <title>🥸 Yet Another Testing dApp</title>
        <meta property="og:title" content="🥸 Yet Another Testing dApp" />
        <meta
          name="description"
          content="Testing Coinbase Wallet with wagmi, rainbowkit, web3-react, web3-onboard, thirdweb, and more"
        />
        <meta
          name="og:description"
          content="Testing Coinbase Wallet with wagmi, rainbowkit, web3-react, web3-onboard, thirdweb, and more"
        />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="any" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://yet-another-testing-dapp.netlify.app/logo.png" />
      </head>
      <body>
        <ChakraProviders>
          <AppProvider>
            <WagmiProviders>
              <Web3ReactProvider connectors={[web3Connectors]}>
                <Box minH="100vh" bg={useColorModeValue("gray.100", "gray.900")}>
                  <SidebarContent />
                  <Box ml={{ base: 0, md: 280 }} p="4">
                    <Container maxW={"1200"}>
                      <Stack
                        spacing={4}
                        w={"full"}
                        bg={useColorModeValue("white", "gray.700")}
                        justify={"center"}
                        rounded={"xl"}
                        boxShadow={"lg"}
                        px={6}
                        py={10}
                        my={12}
                        gap={12}
                      >
                        {children}
                      </Stack>
                    </Container>
                    <Flex
                      pt={6}
                      pb={4}
                      gap={2}
                      direction="column"
                      justify="center"
                      alignItems="center"
                    >
                      <Box fontSize="11px">
                        Made with 💙 by
                        <Link href="https://coinbase.com/wallet" isExternal>
                          {" "}
                          Coinbase Wallet
                        </Link>
                      </Box>
                      <Box fontSize="10px">
                        homer simpson icon by
                        <Link href="https://icons8.com/" isExternal>
                          {" "}
                          Icons8
                        </Link>
                      </Box>
                    </Flex>
                  </Box>
                </Box>
              </Web3ReactProvider>
            </WagmiProviders>
          </AppProvider>
        </ChakraProviders>
      </body>
    </html>
  );
}
