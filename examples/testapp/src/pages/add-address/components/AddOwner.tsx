import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK, getCryptoKeyAccount } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';
import { decodeAbiParameters, encodeFunctionData, toHex } from 'viem';

import { abi } from './constants';

export function AddOwner({ sdk }: { sdk: ReturnType<typeof createCoinbaseWalletSDK> }) {
  const [subAccount, setSubAccount] = useState<string>();

  const handleAddOwner = useCallback(async () => {
    if (!sdk) {
      return;
    }
    const provider = sdk.getProvider();
    const subaccount = (await provider?.request({
      method: 'wallet_addSubAccount',
      params: [{}],
    })) as {
      address: string;
      root: string;
    };

    try {
      const ckaccount = await getCryptoKeyAccount();
      const [x, y] = decodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'bytes32' }],
        ckaccount.account.publicKey
      );
      const calls = [
        {
          to: subaccount.address,
          data: encodeFunctionData({
            abi,
            functionName: 'addOwnerPublicKey',
            args: [x, y] as const,
          }),
          value: toHex(0),
        },
      ];

      const response = (await provider.request({
        method: 'wallet_sendCalls',
        params: [
          {
            version: 1,
            from: subaccount.root,
            chainId: toHex(84532),
            calls,
          },
        ],
      })) as { address: string };

      console.info('customlogs: response', response);

      setSubAccount(response.address);
    } catch (error) {
      console.error('customlogs: error', error);
    }
  }, [sdk]);

  return (
    <>
      <Button w="full" onClick={handleAddOwner}>
        Add Owner
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
