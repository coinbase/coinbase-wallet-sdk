import { RpcRequestInput } from './RpcRequestInput';

const ethSendTransaction: RpcRequestInput = {
  method: 'eth_sendTransaction',
  params: [
    { key: 'from', required: true },
    { key: 'to', required: true },
    { key: 'value', required: true },
    { key: 'gasLimit', required: false },
    { key: 'gasPriceInWei', required: false },
    { key: 'maxFeePerGas', required: false },
    { key: 'maxPriorityFeePerGas', required: false },
    { key: 'data', required: false },
  ],
  format: (data: Record<string, string>) => [
    {
      from: data.from,
      to: data.to,
      value: data.value,
      gasLimit: data.gasLimit,
      gasPriceInWei: data.gasPriceInWei,
      maxFeePerGas: data.maxFeePerGas,
      maxPriorityFeePerGas: data.maxPriorityFeePerGas,
      data: data.data,
    },
  ],
};

export const sendMethods = [ethSendTransaction];
