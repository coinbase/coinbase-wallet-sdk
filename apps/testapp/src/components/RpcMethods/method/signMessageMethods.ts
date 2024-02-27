import { PublicClient } from 'viem/_types/clients/createPublicClient';

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
  format: (data: Record<string, string>) => [data.message, data.address],
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
  viemPublicClient,
}: {
  method: string;
  from: string;
  sign: string;
  message: unknown;
  viemPublicClient: PublicClient;
}) => {
  switch (method) {
    case 'personal_sign': {
      const valid = await viemPublicClient.verifyMessage({
        address: from,
        message,
        signature: sign,
      });

      if (valid) {
        return `ViemPublicClient Successfully verified signer: ${from}`;
      } else {
        return `ViemPublicClient Failed to verify signer: ${from}`;
      }
    }
    case 'eth_signTypedData_v1': {
      const valid = await viemPublicClient.verifyTypedData({
        address: from,
        domain: message.domain,
        types: message.types,
        primaryType: message.primaryType,
        message: message.message,
        signature: sign,
      });

      if (valid) {
        return `ViemPublicClient Successfully verified signer: ${from}`;
      } else {
        return `ViemPublicClient Failed to verify signer: ${from}`;
      }
    }
    case 'eth_signTypedData_v3': {
      const valid = await viemPublicClient.verifyTypedData({
        address: from,
        domain: message.domain,
        types: message.types,
        primaryType: message.primaryType,
        message: message.message,
        signature: sign,
      });

      if (valid) {
        return `ViemPublicClient Successfully verified signer: ${from}`;
      } else {
        return `ViemPublicClient Failed to verify signer: ${from}`;
      }
    }
    case 'eth_signTypedData_v4': {
      const valid = await viemPublicClient.verifyTypedData({
        address: from,
        domain: message.domain,
        types: message.types,
        primaryType: message.primaryType,
        message: message.message,
        signature: sign,
      });

      if (valid) {
        return `ViemPublicClient Successfully verified signer: ${from}`;
      } else {
        return `ViemPublicClient Failed to verify signer: ${from}`;
      }
    }
    default:
      return null;
  }
};
