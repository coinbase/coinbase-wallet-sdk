import {
  MessageTypes,
  recoverPersonalSignature,
  recoverTypedSignature,
  SignTypedDataVersion,
  TypedDataV1,
  TypedMessage,
} from '@metamask/eth-sig-util';

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

export const verifySignMsg = ({
  method,
  from,
  sign,
  message,
}: {
  method: string;
  from: string;
  sign: string;
  message: unknown;
}) => {
  switch (method) {
    case 'personal_sign': {
      const msg = `0x${Buffer.from(message as string, 'utf8').toString('hex')}`;
      const recoveredAddr = recoverPersonalSignature({
        data: msg,
        signature: sign,
      });
      if (recoveredAddr === from) {
        return `SigUtil Successfully verified signer as ${recoveredAddr}`;
      } else {
        return `SigUtil Failed to verify signer when comparing ${recoveredAddr} to ${from}`;
      }
    }
    case 'eth_signTypedData_v1': {
      const recoveredAddr = recoverTypedSignature({
        data: message as TypedDataV1,
        signature: sign,
        version: SignTypedDataVersion.V1,
      });
      if (recoveredAddr === from) {
        return `SigUtil Successfully verified signer as ${recoveredAddr}`;
      } else {
        return `SigUtil Failed to verify signer when comparing ${recoveredAddr} to ${from}`;
      }
    }
    case 'eth_signTypedData_v3': {
      const recoveredAddr = recoverTypedSignature({
        data: message as TypedMessage<MessageTypes>,
        signature: sign,
        version: SignTypedDataVersion.V3,
      });
      if (recoveredAddr === from) {
        return `SigUtil Successfully verified signer as ${recoveredAddr}`;
      } else {
        return `SigUtil Failed to verify signer when comparing ${recoveredAddr} to ${from}`;
      }
    }
    case 'eth_signTypedData_v4': {
      const recoveredAddr = recoverTypedSignature({
        data: message as TypedMessage<MessageTypes>,
        signature: sign,
        version: SignTypedDataVersion.V4,
      });
      if (recoveredAddr === from) {
        return `SigUtil Successfully verified signer as ${recoveredAddr}`;
      } else {
        return `SigUtil Failed to verify signer when comparing ${recoveredAddr} to ${from}`;
      }
    }
    default:
      return null;
  }
};
