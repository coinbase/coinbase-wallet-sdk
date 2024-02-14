import { RpcRequestInput } from './RpcRequestInput';

const eth_getBalance: RpcRequestInput = {
  method: 'eth_getBalance',
  params: [
    { key: 'address', required: true },
    { key: 'blockNumber', required: true },
  ],
  format: (data: Record<string, string>) => [data.address, data.blockNumber],
};

const eth_getTransactionCount: RpcRequestInput = {
  method: 'eth_getTransactionCount',
  params: [
    { key: 'address', required: true },
    { key: 'blockNumber', required: true },
  ],
  format: (data: Record<string, string>) => [data.address, data.blockNumber],
};

export const readonlyJsonRpcMethods = [eth_getBalance, eth_getTransactionCount];
