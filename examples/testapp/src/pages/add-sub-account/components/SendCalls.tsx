import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import { useCallback, useState } from 'react';
import { numberToHex } from 'viem';
import { baseSepolia } from 'viem/chains';

export function SendCalls({
  sdk,
  subAccountAddress,
}: {
  sdk: ReturnType<typeof createCoinbaseWalletSDK>;
  subAccountAddress: string;
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
            chainId: numberToHex(baseSepolia.id),
            from: subAccountAddress,
            calls: [
              {
                to: '0x000000000000000000000000000000000000dead',
                data: '0x',
                value: '0x0',
              },
            ],
            version: '1',
            capabilities: {
              paymasterService: {
                url: 'https://api.developer.coinbase.com/rpc/v1/base-sepolia/S-fOd2n2Oi4fl4e1Crm83XeDXZ7tkg8O',
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
  }, [sdk, subAccountAddress]);

  return (
    <>
      <Button w="full" onClick={handleSendCalls}>
        Send Calls
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
