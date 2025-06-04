import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import { useCallback, useState } from 'react';
import { createPublicClient, http, toHex } from 'viem';
import { baseSepolia } from 'viem/chains';

export function PersonalSign({
  sdk,
  subAccountAddress,
}: {
  sdk: ReturnType<typeof createCoinbaseWalletSDK>;
  subAccountAddress: string;
}) {
  const [state, setState] = useState<string>();
  const handlePersonalSign = useCallback(async () => {
    if (!sdk) {
      return;
    }

    const provider = sdk.getProvider();
    try {
      const response = await provider.request({
        method: 'personal_sign',
        params: [toHex('Hello, world!'), subAccountAddress],
      });

      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });

      const isValid = await publicClient.verifyMessage({
        address: subAccountAddress as `0x${string}`,
        message: 'Hello, world!',
        signature: response as `0x${string}`,
      });

      console.info('response', response);
      setState(`isValid: ${isValid ? 'true' : 'false'} ${response as string} `);
    } catch (e) {
      console.error('error', e);
    }
  }, [sdk, subAccountAddress]);

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
