import { createBaseAccountSDK } from '@base-org/account';
import { Box, Button } from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import { Client, createPublicClient, encodeFunctionData, http, toHex } from 'viem';
import { SmartAccount, createBundlerClient, createPaymasterClient } from 'viem/account-abstraction';
import { base } from 'viem/chains';
import { abi } from '../../../constants';

// Demo placeholder. Replace with your own paymaster/bundler endpoint in real usage.
const PAYMASTER_URL = 'https://example.paymaster.com';

export function AddGlobalOwner({
  sdk,
  subAccount,
  onOwnerAdded,
}: {
  sdk: ReturnType<typeof createBaseAccountSDK>;
  subAccount: SmartAccount;
  onOwnerAdded?: () => void;
}) {
  const [state, setState] = useState<string>();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddGlobalOwner = useCallback(async () => {
    if (!sdk || isAdding) {
      return;
    }

    setIsAdding(true);

    try {
      const provider = sdk.getProvider();
      const accounts = await provider.request({
        method: 'eth_accounts',
      });

      // biome-ignore lint/suspicious/noConsole: internal logging
      console.log('customlogs: accounts', accounts);

      const client = createPublicClient({
        chain: base,
        transport: http(),
      });
      const paymasterClient = createPaymasterClient({
        transport: http(PAYMASTER_URL),
      });
      const bundlerClient = createBundlerClient({
        account: subAccount,
        client: client as Client,
        transport: http(PAYMASTER_URL),
        paymaster: paymasterClient,
      });
      // @ts-ignore
      const hash = await bundlerClient.sendUserOperation({
        calls: [
          {
            to: subAccount.address,
            data: encodeFunctionData({
              abi,
              functionName: 'addOwnerAddress',
              args: [accounts[0]] as const,
            }),
            value: toHex(0),
          },
        ],
      });

      console.info('response', hash);
      setState(`Adding owner... UserOp: ${hash as string}`);

      // Wait a bit for the transaction to be processed
      setTimeout(() => {
        setState(`Owner added! UserOp: ${hash as string}`);
        onOwnerAdded?.();
      }, 2000);
    } catch (e) {
      console.error('error', e);
      setState(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsAdding(false);
    }
  }, [sdk, subAccount, onOwnerAdded, isAdding]);

  return (
    <>
      <Button
        w="full"
        onClick={handleAddGlobalOwner}
        isLoading={isAdding}
        loadingText="Adding Owner..."
        bg="orange.500"
        color="white"
        border="1px solid"
        borderColor="orange.500"
        _hover={{ bg: 'orange.600', borderColor: 'orange.600' }}
        _dark={{
          bg: 'orange.600',
          borderColor: 'orange.600',
          _hover: { bg: 'orange.700', borderColor: 'orange.700' },
        }}
      >
        Add Global Owner
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
