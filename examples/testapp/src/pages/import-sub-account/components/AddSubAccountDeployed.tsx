import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import { useCallback, useState } from 'react';
import { numberToHex } from 'viem';
import { SmartAccount } from 'viem/account-abstraction';
import { baseSepolia } from 'viem/chains';

type AddSubAccountProps = {
  sdk: ReturnType<typeof createCoinbaseWalletSDK>;
  subAccount: SmartAccount;
};

export function AddSubAccountDeployed({ sdk, subAccount }: AddSubAccountProps) {
  const [subAccountAddress, setSubAccountAddress] = useState<string | null>(null);

  const handleAddSubAccount = useCallback(async () => {
    if (!sdk) {
      return;
    }
    const provider = sdk.getProvider();
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: numberToHex(84532) }],
    });

    const response = (await provider.request({
      method: 'wallet_addSubAccount',
      params: [
        {
          version: '1',
          account: {
            type: 'deployed',
            address: subAccount.address,
            chainId: baseSepolia.id,
          },
        },
      ],
    })) as { address: string };

    console.info('response', response);
    setSubAccountAddress(response.address);
  }, [sdk, subAccount]);

  return (
    <>
      <Button w="full" onClick={handleAddSubAccount}>
        Add Address Deployed
      </Button>
      {subAccountAddress && (
        <Box
          as="pre"
          w="full"
          p={2}
          bg="gray.900"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.700"
        >
          {subAccountAddress}
        </Box>
      )}
    </>
  );
}
