import { parseMessage } from '../shortcut/ShortcutType';
import { RpcRequestInput } from './RpcRequestInput';

const walletGetCapabilities: RpcRequestInput = {
  method: 'wallet_getCapabilities',
  params: [],
};

const walletSendTransaction: RpcRequestInput = {
  method: 'wallet_sendTransaction',
  params: [
    { key: 'chainId', required: true },
    { key: 'sender', required: true },
    { key: 'calls', required: true },
    { key: 'version', required: true },
    { key: 'gas', required: false },
    { key: 'capabilities', required: false },
  ],
  format: (data: Record<string, string>) => [
    {
      chainId: data.chainId,
      sender: data.sender,
      calls: data.calls,
      version: data.version,
      gas: data.gas,
      capabilities: parseMessage(data.capabilities),
    },
  ],
};

const walletGetTransactionStatus: RpcRequestInput = {
  method: 'wallet_getTransactionStatus',
  params: [{ key: 'params', required: true }],
  format: (data: Record<string, string>) => [data.params],
};

export const walletTxMethods = [
  walletGetCapabilities,
  walletGetTransactionStatus,
  walletSendTransaction,
];
