"use client";

import { useCallback } from "react";

import { Box, Button } from "@chakra-ui/react";

import { BadgeUnsupported } from "@/app/components/Badges";
import { Section } from "@/app/components/Section";
import { windowEthereum } from "@/app/utils/windowEthereum";

/**
 * EIP-2255
 *
 * wallet_requestPermissions
 */
export const RequestPermissions = () => {
  const handleRequest = useCallback(async () => {
    try {
      const result = await windowEthereum?.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }, []);

  return (
    <Box dir="column">
      <Section
        isHidden
        badge={<BadgeUnsupported />}
        title="wallet_requestPermissions"
        results={undefined}
        refLink="https://eips.ethereum.org/EIPS/eip-2255"
      >
        <Button onClick={handleRequest} fontSize="sm" rounded="full" colorScheme="teal">
          Request Permissions
        </Button>
      </Section>
    </Box>
  );
};
