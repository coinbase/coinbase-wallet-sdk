import { Box, Button } from '@chakra-ui/react';
import { createCoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useCallback, useState } from 'react';
import { Address, Hex } from 'viem';
import { baseSepolia } from 'viem/chains';

export const SPEND_PERMISSION_MANAGER_ADDRESS =
  '0xf85210B21cC50302F477BA56686d2019dC9b67Ad' as Address;

const makeSpendPermissionTypedData = ({
  chainId,
  account,
  spender,
  token,
  allowance,
  period,
  start,
  end,
  salt,
  extraData,
}: {
  chainId: number;
  account: Hex;
  spender: Hex;
  token: Hex;
  allowance: Hex;
  period: number;
  start: number;
  end: number;
  salt: Hex;
  extraData: Hex;
}) => {
  return {
    domain: {
      name: 'Spend Permission Manager',
      version: '1',
      chainId,
      verifyingContract: SPEND_PERMISSION_MANAGER_ADDRESS,
    },
    types: {
      SpendPermission: [
        { name: 'account', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'allowance', type: 'uint160' },
        { name: 'period', type: 'uint48' },
        { name: 'start', type: 'uint48' },
        { name: 'end', type: 'uint48' },
        { name: 'salt', type: 'uint256' },
        { name: 'extraData', type: 'bytes' },
      ],
    },
    primaryType: 'SpendPermission',
    message: {
      account,
      spender,
      token,
      allowance,
      period,
      start,
      end,
      salt,
      extraData,
    },
  };
};

export function GrantSpendPermission({
  sdk,
  subAccountAddress,
}: {
  sdk: ReturnType<typeof createCoinbaseWalletSDK>;
  subAccountAddress: string;
}) {
  const [state, setState] = useState<Hex>();

  const handleGrantSpendPermission = useCallback(async () => {
    if (!sdk) {
      return;
    }

    try {
      const provider = sdk.getProvider();
      const accounts = (await provider?.request({
        method: 'eth_accounts',
        params: [
          {
            version: '1',
            capabilities: {
              getSubAccounts: true,
            },
          },
        ],
      })) as string[];

      const data = {
        chainId: baseSepolia.id,
        account: accounts[0],
        spender: subAccountAddress,
        token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        allowance: '0x2386F26FC10000',
        period: 86400,
        start: 1724264802,
        end: 17242884802,
        salt: '0x1',
        extraData: '0x',
      };

      const spendPermission = makeSpendPermissionTypedData({
        chainId: baseSepolia.id,
        account: accounts[0] as Address,
        spender: subAccountAddress as Address,
        token: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        allowance: '0x2386F26FC10000',
        period: 86400,
        start: 1724264802,
        end: 17242884802,
        salt: '0x1',
        extraData: '0x',
      });

      const response = await provider?.request({
        method: 'eth_signTypedData_v4',
        params: [accounts[0] as Address, spendPermission],
      });
      console.info('customlogs: response', response);
      localStorage.setItem('cbwsdk.demo.spend-permission.signature', response as Hex);
      localStorage.setItem('cbwsdk.demo.spend-permission.data', JSON.stringify(data));
      setState(response as Hex);
    } catch (error) {
      console.error('customlogs: error', error);
    }
  }, [sdk, subAccountAddress]);

  return (
    <>
      <Button w="full" onClick={handleGrantSpendPermission}>
        Grant Spend Permission
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

export const spendPermissionManagerAbi = [
  {
    type: 'constructor',
    inputs: [
      {
        name: 'publicERC6492Validator',
        type: 'address',
        internalType: 'contract PublicERC6492Validator',
      },
      { name: 'magicSpend', type: 'address', internalType: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  { type: 'receive', stateMutability: 'payable' },
  {
    type: 'function',
    name: 'MAGIC_SPEND',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'NATIVE_TOKEN',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'PERMISSION_DETAILS_TYPEHASH',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'PUBLIC_ERC6492_VALIDATOR',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'address',
        internalType: 'contract PublicERC6492Validator',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'SPEND_PERMISSION_BATCH_TYPEHASH',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'SPEND_PERMISSION_TYPEHASH',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approveBatchWithSignature',
    inputs: [
      {
        name: 'spendPermissionBatch',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermissionBatch',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          {
            name: 'permissions',
            type: 'tuple[]',
            internalType: 'struct SpendPermissionManager.PermissionDetails[]',
            components: [
              {
                name: 'spender',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'token',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'allowance',
                type: 'uint160',
                internalType: 'uint160',
              },
              {
                name: 'salt',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'extraData',
                type: 'bytes',
                internalType: 'bytes',
              },
            ],
          },
        ],
      },
      { name: 'signature', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approveWithRevoke',
    inputs: [
      {
        name: 'permissionToApprove',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: 'permissionToRevoke',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
      {
        name: 'expectedLastUpdatedPeriod',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approveWithSignature',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
      { name: 'signature', type: 'bytes', internalType: 'bytes' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'eip712Domain',
    inputs: [],
    outputs: [
      { name: 'fields', type: 'bytes1', internalType: 'bytes1' },
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'version', type: 'string', internalType: 'string' },
      { name: 'chainId', type: 'uint256', internalType: 'uint256' },
      {
        name: 'verifyingContract',
        type: 'address',
        internalType: 'address',
      },
      { name: 'salt', type: 'bytes32', internalType: 'bytes32' },
      {
        name: 'extensions',
        type: 'uint256[]',
        internalType: 'uint256[]',
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBatchHash',
    inputs: [
      {
        name: 'spendPermissionBatch',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermissionBatch',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          {
            name: 'permissions',
            type: 'tuple[]',
            internalType: 'struct SpendPermissionManager.PermissionDetails[]',
            components: [
              {
                name: 'spender',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'token',
                type: 'address',
                internalType: 'address',
              },
              {
                name: 'allowance',
                type: 'uint160',
                internalType: 'uint160',
              },
              {
                name: 'salt',
                type: 'uint256',
                internalType: 'uint256',
              },
              {
                name: 'extraData',
                type: 'bytes',
                internalType: 'bytes',
              },
            ],
          },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCurrentPeriod',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getHash',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getLastUpdatedPeriod',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isApproved',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isRevoked',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isValid',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'revoke',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revokeAsSpender',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'spend',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
      { name: 'value', type: 'uint160', internalType: 'uint160' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'spendWithWithdraw',
    inputs: [
      {
        name: 'spendPermission',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
      { name: 'value', type: 'uint160', internalType: 'uint160' },
      {
        name: 'withdrawRequest',
        type: 'tuple',
        internalType: 'struct MagicSpend.WithdrawRequest',
        components: [
          { name: 'signature', type: 'bytes', internalType: 'bytes' },
          { name: 'asset', type: 'address', internalType: 'address' },
          { name: 'amount', type: 'uint256', internalType: 'uint256' },
          { name: 'nonce', type: 'uint256', internalType: 'uint256' },
          { name: 'expiry', type: 'uint48', internalType: 'uint48' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'SpendPermissionApproved',
    inputs: [
      {
        name: 'hash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'spendPermission',
        type: 'tuple',
        indexed: false,
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SpendPermissionRevoked',
    inputs: [
      {
        name: 'hash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'spendPermission',
        type: 'tuple',
        indexed: false,
        internalType: 'struct SpendPermissionManager.SpendPermission',
        components: [
          { name: 'account', type: 'address', internalType: 'address' },
          { name: 'spender', type: 'address', internalType: 'address' },
          { name: 'token', type: 'address', internalType: 'address' },
          {
            name: 'allowance',
            type: 'uint160',
            internalType: 'uint160',
          },
          { name: 'period', type: 'uint48', internalType: 'uint48' },
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'salt', type: 'uint256', internalType: 'uint256' },
          { name: 'extraData', type: 'bytes', internalType: 'bytes' },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'SpendPermissionUsed',
    inputs: [
      {
        name: 'hash',
        type: 'bytes32',
        indexed: true,
        internalType: 'bytes32',
      },
      {
        name: 'account',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'spender',
        type: 'address',
        indexed: true,
        internalType: 'address',
      },
      {
        name: 'token',
        type: 'address',
        indexed: false,
        internalType: 'address',
      },
      {
        name: 'periodSpend',
        type: 'tuple',
        indexed: false,
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
    ],
    anonymous: false,
  },
  {
    type: 'error',
    name: 'AfterSpendPermissionEnd',
    inputs: [
      {
        name: 'currentTimestamp',
        type: 'uint48',
        internalType: 'uint48',
      },
      { name: 'end', type: 'uint48', internalType: 'uint48' },
    ],
  },
  {
    type: 'error',
    name: 'BeforeSpendPermissionStart',
    inputs: [
      {
        name: 'currentTimestamp',
        type: 'uint48',
        internalType: 'uint48',
      },
      { name: 'start', type: 'uint48', internalType: 'uint48' },
    ],
  },
  {
    type: 'error',
    name: 'ERC721TokenNotSupported',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
  },
  { type: 'error', name: 'EmptySpendPermissionBatch', inputs: [] },
  {
    type: 'error',
    name: 'ExceededSpendPermission',
    inputs: [
      { name: 'value', type: 'uint256', internalType: 'uint256' },
      { name: 'allowance', type: 'uint256', internalType: 'uint256' },
    ],
  },
  {
    type: 'error',
    name: 'InvalidLastUpdatedPeriod',
    inputs: [
      {
        name: 'actualLastUpdatedPeriod',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
      {
        name: 'expectedLastUpdatedPeriod',
        type: 'tuple',
        internalType: 'struct SpendPermissionManager.PeriodSpend',
        components: [
          { name: 'start', type: 'uint48', internalType: 'uint48' },
          { name: 'end', type: 'uint48', internalType: 'uint48' },
          { name: 'spend', type: 'uint160', internalType: 'uint160' },
        ],
      },
    ],
  },
  {
    type: 'error',
    name: 'InvalidSender',
    inputs: [
      { name: 'sender', type: 'address', internalType: 'address' },
      { name: 'expected', type: 'address', internalType: 'address' },
    ],
  },
  { type: 'error', name: 'InvalidSignature', inputs: [] },
  {
    type: 'error',
    name: 'InvalidStartEnd',
    inputs: [
      { name: 'start', type: 'uint48', internalType: 'uint48' },
      { name: 'end', type: 'uint48', internalType: 'uint48' },
    ],
  },
  {
    type: 'error',
    name: 'InvalidWithdrawRequestNonce',
    inputs: [
      {
        name: 'noncePostfix',
        type: 'uint128',
        internalType: 'uint128',
      },
      {
        name: 'permissionHashPostfix',
        type: 'uint128',
        internalType: 'uint128',
      },
    ],
  },
  {
    type: 'error',
    name: 'MismatchedAccounts',
    inputs: [
      {
        name: 'firstAccount',
        type: 'address',
        internalType: 'address',
      },
      {
        name: 'secondAccount',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'SafeERC20FailedOperation',
    inputs: [{ name: 'token', type: 'address', internalType: 'address' }],
  },
  {
    type: 'error',
    name: 'SpendTokenWithdrawAssetMismatch',
    inputs: [
      { name: 'spendToken', type: 'address', internalType: 'address' },
      {
        name: 'withdrawAsset',
        type: 'address',
        internalType: 'address',
      },
    ],
  },
  {
    type: 'error',
    name: 'SpendValueOverflow',
    inputs: [{ name: 'value', type: 'uint256', internalType: 'uint256' }],
  },
  {
    type: 'error',
    name: 'SpendValueWithdrawAmountMismatch',
    inputs: [
      { name: 'spendValue', type: 'uint256', internalType: 'uint256' },
      {
        name: 'withdrawAmount',
        type: 'uint256',
        internalType: 'uint256',
      },
    ],
  },
  { type: 'error', name: 'UnauthorizedSpendPermission', inputs: [] },
  {
    type: 'error',
    name: 'UnexpectedReceiveAmount',
    inputs: [
      { name: 'received', type: 'uint256', internalType: 'uint256' },
      { name: 'expected', type: 'uint256', internalType: 'uint256' },
    ],
  },
  { type: 'error', name: 'ZeroAllowance', inputs: [] },
  { type: 'error', name: 'ZeroPeriod', inputs: [] },
  { type: 'error', name: 'ZeroSpender', inputs: [] },
  { type: 'error', name: 'ZeroToken', inputs: [] },
  { type: 'error', name: 'ZeroValue', inputs: [] },
] as const;
