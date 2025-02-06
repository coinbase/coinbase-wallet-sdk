import { Chain, createPublicClient, http, TypedDataDomain } from 'viem';

import { parseMessage } from '../shortcut/ShortcutType';
import { RpcRequestInput } from './RpcRequestInput';

const ethSign: RpcRequestInput = {
  method: 'eth_sign',
  params: [
    { key: 'message', required: true },
    { key: 'address', required: true },
  ],
  format: (data: Record<string, string>) => [
    data.address,
    `0x${Buffer.from(data.message, 'utf8').toString('hex')}`,
  ],
};

const personalSign: RpcRequestInput = {
  method: 'personal_sign',
  params: [
    { key: 'message', required: true },
    { key: 'address', required: true },
  ],
  format: (data: Record<string, string>) => [
    `0x${Buffer.from(data.message, 'utf8').toString('hex')}`,
    data.address,
  ],
};

const ethSignTypedDataV1: RpcRequestInput = {
  method: 'eth_signTypedData_v1',
  params: [
    { key: 'message', required: true },
    { key: 'address', required: true },
  ],
  format: (data: Record<string, string>) => [parseMessage(data.message), data.address],
};

const ethSignTypedDataV3: RpcRequestInput = {
  method: 'eth_signTypedData_v3',
  params: [
    { key: 'message', required: true },
    { key: 'address', required: true },
  ],
  format: (data: Record<string, string>) => [data.address, parseMessage(data.message)],
};

const ethSignTypedDataV4: RpcRequestInput = {
  method: 'eth_signTypedData_v4',
  params: [
    { key: 'message', required: true },
    { key: 'address', required: true },
  ],
  format: (data: Record<string, string>) => [data.address, parseMessage(data.message)],
};

export const signMessageMethods = [
  ethSign,
  personalSign,
  ethSignTypedDataV1,
  ethSignTypedDataV3,
  ethSignTypedDataV4,
];

export const verifySignMsg = async ({
  method,
  from,
  sign,
  message,
  chain,
}: {
  method: string;
  from: string;
  sign: string;
  message: unknown;
  chain: Chain;
}) => {
  switch (method) {
    case 'personal_sign': {
      const client = createPublicClient({
        chain,
        transport: http(),
      });

      const valid = await client.verifyMessage({
        address: from as `0x${string}`,
        message: message as string,
        signature: sign as `0x${string}`,
      });
      if (valid) {
        return `SigUtil Successfully verified signer as ${from}`;
      }
      return 'SigUtil Failed to verify signer';
    }
    case 'eth_signTypedData_v1':
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData_v4': {
      const client = createPublicClient({
        chain,
        transport: http(),
      });

      // Parse the message if it's a string
      const typedData = typeof message === 'string' ? JSON.parse(message) : message;

      const valid = await client.verifyTypedData({
        address: from as `0x${string}`,
        domain: typedData['domain'] as TypedDataDomain,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        types: typedData['types'] as any,
        primaryType: typedData['primaryType'] as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: typedData['message'] as any,
        signature: sign as `0x${string}`,
      });
      if (valid) {
        return `SigUtil Successfully verified signer as ${from}`;
      }
      return 'SigUtil Failed to verify signer';
    }
    default:
      return null;
  }
};
