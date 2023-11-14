import { RpcMethod } from '../RpcMethod';

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
};

export const signMessageMethods: RpcMethod[] = [ethSign, personalSign];
