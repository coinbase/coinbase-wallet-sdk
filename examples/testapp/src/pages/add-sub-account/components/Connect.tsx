import { Box, Button } from '@chakra-ui/react';
import { CoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import { useCallback, useEffect, useState } from 'react';

export function Connect({ sdk }: { sdk: CoinbaseWalletSDK }) {
  const [state, setState] = useState<string[]>();
  const handleConnect = useCallback(async () => {
    if (!sdk) {
      return;
    }

    const provider = sdk.makeWeb3Provider('', 1); // Replace '' with the desired JSON-RPC URL and 1 with the chain ID
    const response = await provider.request({
      method: 'eth_requestAccounts',
    });

    console.info('response', response);
    setState(response as string[]);
  }, [sdk]);

  useEffect(() => {
    if (!sdk) {
      return;
    }

    const provider = sdk.makeWeb3Provider('', 1); // Replace '' with the desired JSON-RPC URL and 1 with the chain ID
    provider.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        setState(undefined);
      } else {
        setState(accounts as string[]);
      }
    });
  }, [sdk]);

  return (
    <>
      <Button w="full" onClick={handleConnect}>
        Connect
      </Button>
      {state && (
        <Box
          as="pre"
          w="full"
          p={2}
          bg="gray.900"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.700"
        >
          {JSON.stringify(state, null, 2)}
        </Box>
      )}
    </>
  );
}
