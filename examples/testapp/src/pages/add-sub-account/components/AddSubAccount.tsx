import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK, getCryptoKeyAccount } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';
import { numberToHex } from 'viem';

type AddSubAccountProps = {
  sdk: ReturnType<typeof createCoinbaseWalletSDK>;
  onAddSubAccount: (address: string) => void;
};

export function AddSubAccount({ sdk, onAddSubAccount }: AddSubAccountProps) {
  const [subAccount, setSubAccount] = useState<string>();

  const handleAddSubAccount = useCallback(async () => {
    if (!sdk) {
      return;
    }
    const provider = sdk.getProvider();
    const { account } = await getCryptoKeyAccount();
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
            type: 'create',
            keys: [
              {
                type: 'webauthn-p256',
                key: account.publicKey,
              },
            ],
          },
        },
      ],
    })) as { address: string };

    console.info('customlogs: response', response);
    setSubAccount(response.address);
    onAddSubAccount(response.address);
  }, [sdk, onAddSubAccount]);

  return (
    <>
      <Button w="full" onClick={handleAddSubAccount}>
        Add Address
      </Button>
      {subAccount && (
        <Box
          as="pre"
          w="full"
          p={2}
          bg="gray.900"
          borderRadius="md"
          border="1px solid"
          borderColor="gray.700"
        >
          {JSON.stringify(subAccount, null, 2)}
        </Box>
      )}
    </>
  );
}
