import { createBaseAccountSDK } from '@base-org/account';
import { Box, Button, FormControl, FormLabel, Input, VStack } from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import { numberToHex } from 'viem';
import { SmartAccount } from 'viem/account-abstraction';

type AddSubAccountUndeployedProps = {
  sdk: ReturnType<typeof createBaseAccountSDK>;
  subAccount: SmartAccount;
};

export function AddSubAccountUndeployed({ sdk, subAccount }: AddSubAccountUndeployedProps) {
  const [subAccountAddress, setSubAccountAddress] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState<string>('');

  const handleAddSubAccount = useCallback(async () => {
    if (!sdk) {
      return;
    }
    const provider = sdk.getProvider();
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: numberToHex(8453) }],
    });

    const factoryArgs = await subAccount.getFactoryArgs();

    const response = (await provider.request({
      method: 'wallet_addSubAccount',
      params: [
        {
          version: '1',
          account: {
            type: 'undeployed',
            address: subAccount.address,
            factory: factoryArgs?.factory,
            factoryData: factoryArgs?.factoryData,
            ...(customLabel && { label: customLabel }),
          },
        },
      ],
    })) as { address: string };

    console.info('response', response);
    setSubAccountAddress(response.address);
  }, [sdk, subAccount, customLabel]);

  return (
    <VStack w="full" spacing={2}>
      <FormControl>
        <FormLabel fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
          Custom Label (optional)
        </FormLabel>
        <Input
          placeholder="e.g., DeFi Portfolio, NFT Wallet"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          bg="white"
          _dark={{ bg: 'gray.800' }}
        />
      </FormControl>
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
        Add Address Undeployed
      </Button>
      {subAccountAddress && (
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
          {subAccountAddress}
        </Box>
      )}
    </VStack>
  );
}
