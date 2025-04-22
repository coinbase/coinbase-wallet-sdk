import { Box, Button } from '@chakra-ui/react';
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import { useCallback, useState } from 'react';
import { baseSepolia } from 'viem/chains';

export function AddOwner({ sdk }: { sdk: InstanceType<typeof CoinbaseWalletSDK> }) {
  const [subAccount, setSubAccount] = useState<string>();

  const handleAddOwner = useCallback(async () => {
    if (!sdk) {
      return;
    }

    try {
      const accounts = await sdk.request({ method: 'eth_accounts' });
      const subaccount = await sdk.someValidMethod({
        chainId: baseSepolia.id,
        publicKey: accounts[0], // Assuming the first account is used
      });
      console.info('response', subaccount);
      setSubAccount(subaccount);
    } catch (error) {
      console.error('error', error);
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
