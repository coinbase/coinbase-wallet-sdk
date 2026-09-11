import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';
import { toHex } from 'viem';

export function PersonalSignButton({ sdk }: { sdk: ReturnType<typeof createCoinbaseWalletSDK> }) {
  const [state, setState] = useState<string>();
  const handlePersonalSign = useCallback(async () => {
    if (!sdk) {
      return;
    }

    const provider = sdk.getProvider();
    try {
      const response = await provider.request({
        method: 'personal_sign',
        params: [toHex('Hello, world!')],
      });
      console.info('customlogs: response', response);
      setState(response as string);
    } catch (e) {
      console.error('customlogs: error', e);
    }
  }, [sdk]);

  return (
    <>
      <Button w="full" onClick={handlePersonalSign}>
        Personal Sign
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
          overflow="auto"
          whiteSpace="pre-wrap"
        >
          {JSON.stringify(state, null, 2)}
        </Box>
      )}
    </>
  );
}
