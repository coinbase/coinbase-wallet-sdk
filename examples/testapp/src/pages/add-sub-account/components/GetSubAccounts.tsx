import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import { useCallback, useState } from 'react';

type GetSubAccountsProps = {
  sdk: ReturnType<typeof createCoinbaseWalletSDK>;
};

export function GetSubAccounts({ sdk }: GetSubAccountsProps) {
  const [subAccounts, setSubAccounts] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);

  const handleGetSubAccounts = useCallback(async () => {
    if (!sdk) {
      return;
    }

    setIsLoading(true);
    try {
      const provider = sdk.getProvider();
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      }) as string[];
      if (accounts.length < 2) {
        throw new Error('Create a sub account first by clicking the Add Address button');
      }
      const response = await provider.request({
        method: 'wallet_getSubAccounts',
        params: [{
          account: accounts[1],
          domain: window.location.origin,
        }],
      });

      console.info('getSubAccounts response', response);
      setSubAccounts(response);
    } catch (error) {
      console.error('Error getting sub accounts:', error);
      setSubAccounts({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  }, [sdk]);

  return (
    <>
      <Button w="full" onClick={handleGetSubAccounts} isLoading={isLoading} loadingText="Getting Sub Accounts...">
        Get Sub Accounts
      </Button>
      {subAccounts && (
        <Box
          as="pre"
          w="full"
          p={2}
          bg="gray.900"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.700"
          overflow="auto"
          whiteSpace="pre-wrap"
        >
          {JSON.stringify(subAccounts, null, 2)}
        </Box>
      )}
    </>
  );
} 