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
    { key: 'capabilities', required: true },
  ],
  format: (data: Record<string, string>) => [
    {
      chainId: data.chainId,
      sender: data.sender,
      calls: data.calls,
      capabilities: parseMessage(data.capabilities),
    },
  ],
};

const walletGetTransactionStatus: RpcRequestInput = {
  method: 'wallet_getTransactionStatus',
  params: [{ key: 'params', required: true }],
  format: (data: Record<string, string>) => [data.params],
};

const walletShowTransactionStatus: RpcRequestInput = {
  method: 'wallet_showTransactionStatus',
  params: [{ key: 'params', required: true }],
  format: (data: Record<string, string>) => [data.params],
};

export const walletTxMethods = [
  walletGetCapabilities,
  walletGetTransactionStatus,
  walletShowTransactionStatus,
  walletSendTransaction,
];
