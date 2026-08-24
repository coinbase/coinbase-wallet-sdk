import { createBaseAccountSDK, getCryptoKeyAccount } from '@base-org/account';
import { Box, Button } from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import { Hex, encodeFunctionData, numberToHex } from 'viem';
import { base } from 'viem/chains';

import {
  SPEND_PERMISSION_MANAGER_ADDRESS,
  spendPermissionManagerAbi,
} from './GrantSpendPermission';

export function SpendPermissions({
  sdk,
  subAccountAddress,
}: {
  sdk: ReturnType<typeof createBaseAccountSDK>;
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

    const signature = localStorage.getItem('base-acc-sdk.demo.spend-permission.signature') as Hex;
    const data = JSON.parse(
      localStorage.getItem('base-acc-sdk.demo.spend-permission.data') as string
    );
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
            chainId: numberToHex(base.id),
            from: subAccountAddress,
            calls: [
              {
                to: SPEND_PERMISSION_MANAGER_ADDRESS,
                data: encodeFunctionData({
                  abi: spendPermissionManagerAbi,
                  functionName: 'approveWithSignature',
                  args: [spendPermission, signature],
                }),
                value: '0x0',
              },
              {
                to: SPEND_PERMISSION_MANAGER_ADDRESS,
                data: encodeFunctionData({
                  abi: spendPermissionManagerAbi,
                  functionName: 'spend',
                  args: [spendPermission, BigInt(1)],
                }),
                value: '0x0',
              },
              // extra calls...
            ],
            capabilities: {
              paymasterService: {
                url: 'https://example.paymaster.com',
              },
            },
          },
        ],
      });

      setState(response as string);
      console.info('response', response);
    } catch (error) {
      console.error('error', error);
    }
  }, [subAccountAddress, sdk]);

  return (
    <>
      <Button
        w="full"
        onClick={handleSendCalls}
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
        Use Spend Permission
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
