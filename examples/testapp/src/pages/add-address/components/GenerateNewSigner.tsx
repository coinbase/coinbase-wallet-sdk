import { Box, Button } from '@chakra-ui/react';
import { getCryptoKeyAccount, removeCryptoKey } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';

export function GenerateNewSigner() {
  const [state, setState] = useState<string>();

  const handleGenerateNewSigner = useCallback(async () => {
    try {
      await removeCryptoKey();
      const { account } = await getCryptoKeyAccount();
      setState(account.publicKey);
    } catch (e) {
      console.error('customlogs: error', e);
    }
  }, []);

  return (
    <>
      <Button w="full" onClick={handleGenerateNewSigner}>
        Generate New Signer
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
