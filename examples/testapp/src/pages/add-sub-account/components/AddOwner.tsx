import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK, getCryptoKeyAccount } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';
import { baseSepolia } from 'viem/chains';

export function AddOwner({ sdk }: { sdk: ReturnType<typeof createCoinbaseWalletSDK> }) {
  const [subAccount, setSubAccount] = useState<string>();

  const handleAddOwner = useCallback(async () => {
    if (!sdk) {
      return;
    }

    try {
      const ckaccount = await getCryptoKeyAccount();
      const subaccount = await sdk.subaccount.addOwner({
        chainId: baseSepolia.id,
        publicKey: ckaccount.account.publicKey,
      });
      console.info('customlogs: response', subaccount);
      setSubAccount(subaccount);
    } catch (error) {
      console.error('customlogs: error', error);
    }
  }, [sdk]);

  return (
    <>
      <Button w="full" onClick={handleAddOwner}>
        Add Owner
      </Button>
      {subAccount && (
        <Box
          as="pre"
          w="full"
          p={2}
          bg="gray.900"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.700"
        >
          {JSON.stringify(subAccount, null, 2)}
        </Box>
      )}
    </>
  );
}
