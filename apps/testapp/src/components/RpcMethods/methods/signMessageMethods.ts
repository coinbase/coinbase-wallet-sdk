import {
  MessageTypes,
  recoverPersonalSignature,
  recoverTypedSignature,
  SignTypedDataVersion,
  TypedDataV1,
  TypedMessage,
} from '@metamask/eth-sig-util';

import { RpcMethod } from '../RpcMethod';

const EXAMPLE_MESSAGE = `Example Message`;
export const ADDR_TO_FILL = 'ADDR_TO_FILL';

const ethSign = {
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

const personalSign = {
  method: 'personal_sign',
  params: [
    { key: 'message', required: true },
    { key: 'address', required: true },
  ],
  format: (data: Record<string, string>) => [
    `0x${Buffer.from(data.message, 'utf8').toString('hex')}`,
    data.address,
  ],
  shortcuts: [
    {
      key: EXAMPLE_MESSAGE,
      data: {
        message: EXAMPLE_MESSAGE,
        address: ADDR_TO_FILL,
      },
    },
  ],
};

const ethSignTypedDataV1 = {
  method: 'eth_signTypedData_v1',
  params: [
    { key: 'message', required: true },
    { key: 'address', required: true },
  ],
  format: (data: Record<string, string>) => [data.message, data.address],
  shortcuts: [
    {
      key: EXAMPLE_MESSAGE,
      data: {
        message: [
          {
            type: 'string',
            name: 'Message',
            value: EXAMPLE_MESSAGE,
          },
        ],
        address: ADDR_TO_FILL,
      },
    },
  ],
};

const ethSignTypedDataV3 = {
  method: 'eth_signTypedData_v3',
  params: [
    { key: 'message', required: true },
    { key: 'address', required: true },
  ],
  format: (data: Record<string, string>) => [data.address, JSON.stringify(data.message)],
  shortcuts: [
    {
      key: EXAMPLE_MESSAGE,
      data: {
        message: {
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            Person: [
              { name: 'name', type: 'string' },
              { name: 'wallet', type: 'address' },
            ],
            Mail: [
              { name: 'from', type: 'Person' },
              { name: 'to', type: 'Person' },
              { name: 'contents', type: 'string' },
            ],
          },
          primaryType: 'Mail',
          domain: {
            name: 'Ether Mail',
            version: '1',
            chainId: '1',
            verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
          },
          message: {
            from: {
              name: 'Cow',
              wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
            },
            to: {
              name: 'Bob',
              wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
            },
            contents: 'Hello, Bob!',
          },
        },
        address: ADDR_TO_FILL,
      },
    },
  ],
};

const ethSignTypedDataV4 = {
  method: 'eth_signTypedData_v4',
  params: [
    { key: 'message', required: true },
    { key: 'address', required: true },
  ],
  format: (data: Record<string, string>) => [data.address, JSON.stringify(data.message)],
  shortcuts: [
    {
      key: EXAMPLE_MESSAGE,
      data: {
        message: {
          domain: {
            chainId: '1',
            name: 'Ether Mail',
            verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
            version: '1',
          },
          message: {
            contents: 'Hello, Bob!',
            from: {
              name: 'Cow',
              wallets: [
                '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
                '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
              ],
            },
            to: [
              {
                name: 'Bob',
                wallets: [
                  '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
                  '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
                  '0xB0B0b0b0b0b0B000000000000000000000000000',
                ],
              },
            ],
          },
          primaryType: 'Mail',
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            Group: [
              { name: 'name', type: 'string' },
              { name: 'members', type: 'Person[]' },
            ],
            Mail: [
              { name: 'from', type: 'Person' },
              { name: 'to', type: 'Person[]' },
              { name: 'contents', type: 'string' },
            ],
            Person: [
              { name: 'name', type: 'string' },
              { name: 'wallets', type: 'address[]' },
            ],
          },
        },
        address: ADDR_TO_FILL,
      },
    },
  ],
};

export const signMessageMethods: RpcMethod[] = [
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
