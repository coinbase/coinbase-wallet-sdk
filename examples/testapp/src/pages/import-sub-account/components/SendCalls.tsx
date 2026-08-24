import { createBaseAccountSDK } from '@base-org/account';
import { Box, Button } from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import { SmartAccount } from 'viem/account-abstraction';
import { base } from 'viem/chains';

// Demo placeholder. Replace with your own paymaster service endpoint in real usage.
const PAYMASTER_URL = 'https://example.paymaster.com';

export function SendCalls({
  sdk,
  subAccount,
}: {
  sdk: ReturnType<typeof createBaseAccountSDK>;
  subAccount: SmartAccount;
}) {
  const [state, setState] = useState<string>();
  const handleSendCalls = useCallback(async () => {
    if (!sdk) {
      return;
    }

    const provider = sdk.getProvider();
    try {
      const response = await provider.request({
        method: 'wallet_sendCalls',
        params: [
          {
            chainId: base.id,
            from: subAccount.address,
            calls: [],
            version: '1',
            capabilities: {
              paymasterService: {
                url: PAYMASTER_URL,
              },
            },
          },
        ],
      });
      console.info('response', response);
      setState(response as string);
    } catch (e) {
      console.error('error', e);
    }
  }, [sdk, subAccount.address]);

  return (
    <>
      <Button
        w="full"
        onClick={handleSendCalls}
        bg="blue.500"
        color="white"
        border="1px solid"
        borderColor="blue.500"
        _hover={{ bg: 'blue.600', borderColor: 'blue.600' }}
        _dark={{
          bg: 'blue.600',
          borderColor: 'blue.600',
          _hover: { bg: 'blue.700', borderColor: 'blue.700' },
        }}
      >
        Send Calls
      </Button>
      {state && (
        <Box
          as="pre"
          w="full"
          p={2}
          bg="gray.50"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.300"
          overflow="auto"
          whiteSpace="pre-wrap"
          color="gray.800"
          _dark={{ bg: 'gray.900', borderColor: 'gray.700', color: 'gray.200' }}
        >
          {JSON.stringify(state, null, 2)}
        </Box>
      )}
    </>
  );
}
