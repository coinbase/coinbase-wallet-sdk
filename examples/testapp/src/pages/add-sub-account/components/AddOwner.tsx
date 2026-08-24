import { createBaseAccountSDK, getCryptoKeyAccount } from '@base-org/account';
import { Box, Button } from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import { base } from 'viem/chains';

export function AddOwner({ sdk }: { sdk: ReturnType<typeof createBaseAccountSDK> }) {
  const [subAccount, setSubAccount] = useState<string>();

  const handleAddOwner = useCallback(async () => {
    if (!sdk) {
      return;
    }

    try {
      const ckaccount = await getCryptoKeyAccount();
      const subaccount = await sdk.subAccount.addOwner({
        chainId: base.id,
        publicKey: ckaccount.account.publicKey,
      });
      console.info('response', subaccount);
      setSubAccount(subaccount);
    } catch (error) {
      console.error('error', error);
    }
  }, [sdk]);

  return (
    <>
      <Button
        w="full"
        onClick={handleAddOwner}
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
        Add Owner
      </Button>
      {subAccount && (
        <Box
          as="pre"
          w="full"
          p={2}
          bg="gray.50"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.300"
          color="gray.800"
          _dark={{ bg: 'gray.900', borderColor: 'gray.700', color: 'gray.200' }}
        >
          {JSON.stringify(subAccount, null, 2)}
        </Box>
      )}
    </>
  );
}
