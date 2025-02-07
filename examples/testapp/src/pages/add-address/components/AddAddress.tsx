import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK, getCryptoKeyAccount } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';

export function AddAddress({ sdk }: { sdk: ReturnType<typeof createCoinbaseWalletSDK> }) {
  const [subAccount, setSubAccount] = useState<string>();

  const handleAddAddress = useCallback(async () => {
    if (!sdk) {
      return;
    }
    const provider = sdk.getProvider();
    const account = await getCryptoKeyAccount();
    const response = (await provider.request({
      method: 'wallet_addAddress',
      params: [
        {
          version: '1',
          chainId: 84532,
          capabilities: {
            createAccount: {
              signer: account.publicKey,
            },
          },
        },
      ],
    })) as { address: string };

    console.info('customlogs: response', response);
    setSubAccount(response.address);
  }, [sdk]);

  return (
    <>
      <Button w="full" onClick={handleAddAddress}>
        Add Address
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
