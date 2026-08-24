import { createBaseAccountSDK } from '@base-org/account';
import { Box, Button } from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import { Client, createPublicClient, http } from 'viem';
import { SmartAccount, createBundlerClient, createPaymasterClient } from 'viem/account-abstraction';
import { base } from 'viem/chains';

// Demo placeholder. Replace with your own paymaster/bundler endpoint in real usage.
const PAYMASTER_URL = 'https://example.paymaster.com';

export function DeploySubAccount({
  sdk,
  subAccount,
  onDeployed,
}: {
  sdk: ReturnType<typeof createBaseAccountSDK>;
  subAccount: SmartAccount;
  onDeployed?: () => void;
}) {
  const [state, setState] = useState<string>();
  const [isDeploying, setIsDeploying] = useState(false);

  const handleDeploySubAccount = useCallback(async () => {
    if (!sdk || isDeploying) {
      return;
    }

    setIsDeploying(true);

    try {
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
        calls: [],
      });

      console.info('deployment userOp hash:', hash);
      setState(`Deploying... UserOp: ${hash}`);

      // Wait for the UserOperation to be included in a block
      const receipt = await bundlerClient.waitForUserOperationReceipt({
        hash,
      });

      console.info('deployment receipt:', receipt);

      if (receipt.success) {
        setState(`Deployed! UserOp: ${hash}`);
        onDeployed?.();
      } else {
        setState(`Deployment failed. UserOp: ${hash}`);
      }
    } catch (e) {
      console.error('error', e);
      setState(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsDeploying(false);
    }
  }, [sdk, subAccount, onDeployed, isDeploying]);

  return (
    <>
      <Button
        w="full"
        onClick={handleDeploySubAccount}
        isLoading={isDeploying}
        loadingText="Deploying..."
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
        Deploy SubAccount
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
