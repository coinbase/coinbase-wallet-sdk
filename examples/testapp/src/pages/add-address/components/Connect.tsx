import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useCallback, useEffect, useState } from 'react';

export function Connect({ sdk }: { sdk: ReturnType<typeof createCoinbaseWalletSDK> }) {
  const [state, setState] = useState<string[]>();
  const handleConnect = useCallback(async () => {
    if (!sdk) {
      return;
    }

    const provider = sdk.getProvider();
    const response = await provider.request({
      method: 'eth_requestAccounts',
    });

    console.info('customlogs: response', response);
    setState(response as string[]);
  }, [sdk]);

  useEffect(() => {
    if (!sdk) {
      return;
    }

    const provider = sdk.getProvider();
    provider.on('accountsChanged', (accounts) => {
      setState(accounts as string[]);
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
