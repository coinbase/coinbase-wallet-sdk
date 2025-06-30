import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import { useWallets } from '@privy-io/react-auth';
import React, { useCallback, useState } from 'react';

export function AddAddress({ sdk }: { sdk: ReturnType<typeof createCoinbaseWalletSDK> }) {
  const [subAccount, setSubAccount] = useState<string>();
  const { wallets } = useWallets();

  const handleAddAddress = useCallback(async () => {
    if (!sdk) {
      return;
    }
    const provider = sdk.getProvider();
    const wallet = wallets.find((w) => w.connectorType === 'embedded');
    if (!wallet) {
      throw new Error('No wallet found');
    }


    const response = (await provider.request({
      method: 'wallet_addAddress',
      params: [
        {
          chainId: 84532,
          signer: wallet.address,
        },
      ],
    })) as { address: string };

    console.info('customlogs: response', response);

    setSubAccount(response.address);
  }, [sdk, wallets]);

  return (
    <>
      <Button w="full" onClick={handleAddAddress}>
        Create subaccount
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
