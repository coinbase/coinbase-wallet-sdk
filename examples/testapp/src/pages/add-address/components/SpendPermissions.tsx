import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK, getCryptoKeyAccount } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';
import { Address, Client, createPublicClient, Hex, http } from 'viem';
import {
  createBundlerClient,
  createPaymasterClient,
  toCoinbaseSmartAccount,
  WebAuthnAccount,
} from 'viem/account-abstraction';
import { baseSepolia } from 'viem/chains';

import {
  SPEND_PERMISSION_MANAGER_ADDRESS,
  spendPermissionManagerAbi,
} from './GrantSpendPermission';

export function SpendPermissions({ sdk }: { sdk: ReturnType<typeof createCoinbaseWalletSDK> }) {
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
    const subaccount = (await provider?.request({
      method: 'wallet_addAddress',
      params: [
        {
          version: '1',
          chainId: baseSepolia.id,
          capabilities: {
            createAccount: {
              signer: signer.publicKey,
            },
          },
        },
      ],
    })) as { address: Address; root: Address };

    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(),
      pollingInterval: 4_000,
      batch: {
        multicall: true,
      },
    });

    const bundlerClient = createBundlerClient({
      client: client as Client,
      chain: baseSepolia,
      transport: http(
        'https://api.developer.coinbase.com/rpc/v1/base-sepolia/S-fOd2n2Oi4fl4e1Crm83XeDXZ7tkg8O'
      ),
    });
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
    const paymaster = createPaymasterClient({
      transport: http(
        'https://api.developer.coinbase.com/rpc/v1/base-sepolia/S-fOd2n2Oi4fl4e1Crm83XeDXZ7tkg8O'
      ),
    });

    try {
      const account = await toCoinbaseSmartAccount({
        client: client as Client,
        owners: [subaccount.root, signer as WebAuthnAccount],
        ownerIndex: 1,
      });

      // @ts-expect-error just for testing
      const userOperation = await bundlerClient.sendUserOperation({
        account,
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
        ],
        paymaster,
      });

      setState(userOperation);
      console.info('customlogs: userOperation', userOperation);
    } catch (error) {
      console.error('customlogs: error', error);
    }
  }, [sdk]);

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
