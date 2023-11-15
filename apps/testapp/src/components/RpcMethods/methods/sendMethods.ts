import { RpcMethod } from '../RpcMethod';
import { ADDR_TO_FILL } from './signMessageMethods';

const ethSendTransactionLegacy = {
  method: 'eth_sendTransaction',
  params: [
    { key: 'from', required: true },
    { key: 'to', required: true },
    { key: 'value', required: true },
    { key: 'gasLimit', required: true },
    { key: 'gasPriceInWei', required: true },
    { key: 'maxFeePerGas', required: true },
    { key: 'maxPriorityFeePerGas', required: true },
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
    },
  ],
  shortcuts: [
    {
      key: 'Example Tx',
      data: {
        from: ADDR_TO_FILL,
        to: ADDR_TO_FILL,
        value: '0x0',
        gasLimit: '0x5208',
        gasPriceInWei: '0x2540be400',
        maxFeePerGas: '0x2540be400',
        maxPriorityFeePerGas: '0x3b9aca00',
      },
    },
  ],
};

const ethSendTransaction1559 = {
  method: 'eth_sendTransaction',
  params: [
    { key: 'from', required: true },
    { key: 'to', required: true },
    { key: 'value', required: true },
    { key: 'gasLimit', required: true },
    { key: 'maxFeePerGas', required: true },
    { key: 'maxPriorityFeePerGas', required: true },
  ],
  format: (data: Record<string, string>) => [
    {
      from: data.from,
      to: data.to,
      value: data.value,
      gasLimit: data.gasLimit,
      maxFeePerGas: data.maxFeePerGas,
      maxPriorityFeePerGas: data.maxPriorityFeePerGas,
    },
  ],
  shortcuts: [
    {
      key: 'Example 1559 Tx',
      data: {
        from: ADDR_TO_FILL,
        to: ADDR_TO_FILL,
        value: '0x1',
        gasLimit: '0x5208',
        maxFeePerGas: '0x2540be400',
        maxPriorityFeePerGas: '0x3b9aca00',
      },
    },
  ],
};

export const sendMethods: RpcMethod[] = [ethSendTransactionLegacy, ethSendTransaction1559];
