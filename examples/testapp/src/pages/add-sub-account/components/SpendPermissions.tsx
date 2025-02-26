import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK, getCryptoKeyAccount } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';
import { Hex } from 'viem';
import { baseSepolia } from 'viem/chains';

import {
  SPEND_PERMISSION_MANAGER_ADDRESS,
  spendPermissionManagerAbi,
} from './GrantSpendPermission';

export function SpendPermissions({
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
    const { account: signer } = await getCryptoKeyAccount();
    if (!signer) {
      return;
    }

    const signature = localStorage.getItem('cbwsdk.demo.spend-permission.signature') as Hex;
    const data = JSON.parse(localStorage.getItem('cbwsdk.demo.spend-permission.data') as string);
    if (!signature || !data) {
      return;
    }
    const spendPermission = {
      account: data.account,
      spender: data.spender,
      token: data.token,
      allowance: data.allowance,
      period: data.period,
      start: data.start,
      end: data.end,
      salt: data.salt,
      extraData: data.extraData,
    };

    try {
      const response = await provider?.request({
        method: 'wallet_sendCalls',
        params: [
          {
            version: '1',
            chainId: baseSepolia.id,
            from: subAccountAddress,
            calls: [
              {
                to: SPEND_PERMISSION_MANAGER_ADDRESS,
                abi: spendPermissionManagerAbi,
                functionName: 'approveWithSignature',
                args: [spendPermission, signature],
              },
              {
                to: SPEND_PERMISSION_MANAGER_ADDRESS,
                abi: spendPermissionManagerAbi,
                functionName: 'spend',
                args: [spendPermission, BigInt(1)],
              },
              // extra calls...
            ],
            capabilities: {
              paymasterService: {
                url: 'https://api.developer.coinbase.com/rpc/v1/base-sepolia/S-fOd2n2Oi4fl4e1Crm83XeDXZ7tkg8O',
              },
            },
          },
        ],
      });

      setState(response as string);
      console.info('customlogs: response', response);
    } catch (error) {
      console.error('customlogs: error', error);
    }
  }, [subAccountAddress, sdk]);

  return (
    <>
      <Button w="full" onClick={handleSendCalls}>
        Use Spend Permission
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
