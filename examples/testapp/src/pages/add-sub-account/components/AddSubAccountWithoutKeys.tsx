import { createBaseAccountSDK, getCryptoKeyAccount } from '@base-org/account';
import { Box, Button } from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import { numberToHex } from 'viem';

type AddSubAccountWithoutKeysProps = {
  sdk: ReturnType<typeof createBaseAccountSDK>;
  onAddSubAccount: (address: string) => void;
  signerFn: typeof getCryptoKeyAccount;
};

export function AddSubAccountWithoutKeys({
  sdk,
  onAddSubAccount,
  signerFn,
}: AddSubAccountWithoutKeysProps) {
  const [subAccount, setSubAccount] = useState<string>();

  const handleAddSubAccount = useCallback(async () => {
    if (!sdk) {
      return;
    }

    const { account } = await signerFn();

    if (!account) {
      throw new Error('Could not get owner account');
    }

    const provider = sdk.getProvider();
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: numberToHex(8453) }],
    });

    const response = (await provider.request({
      method: 'wallet_addSubAccount',
      params: [
        {
          version: '1',
          account: {
            type: 'create',
          },
        },
      ],
    })) as { address: string };

    console.info('response', response);
    setSubAccount(response.address);
    onAddSubAccount(response.address);
  }, [sdk, onAddSubAccount, signerFn]);

  return (
    <>
      <Button
        w="full"
        onClick={handleAddSubAccount}
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
        Add Address (Without Keys)
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
