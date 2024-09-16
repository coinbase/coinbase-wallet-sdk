import { parseMessage } from '../shortcut/ShortcutType';
import { RpcRequestInput } from './RpcRequestInput';

const walletGetCapabilities: RpcRequestInput = {
  method: 'wallet_getCapabilities',
  params: [],
};

const walletSendCalls: RpcRequestInput = {
  method: 'wallet_sendCalls',
  params: [
    { key: 'version', required: true },
    { key: 'chainId', required: true },
    { key: 'from', required: true },
    { key: 'calls', required: true },
    { key: 'capabilities', required: true },
  ],
  format: (data: Record<string, string>) => [
    {
      chainId: data.chainId,
      from: data.from,
      calls: data.calls,
      version: data.version,
      capabilities: parseMessage(data.capabilities),
    },
  ],
};

const walletGetCallsStatus: RpcRequestInput = {
  method: 'wallet_getCallsStatus',
  params: [{ key: 'params', required: true }],
  format: (data: Record<string, string>) => [data.params],
};

const walletShowCallsStatus: RpcRequestInput = {
  method: 'wallet_showCallsStatus',
  params: [{ key: 'params', required: true }],
  format: (data: { params: string }) => [data.params],
};

export const walletTxMethods = [
  walletGetCapabilities,
  walletGetCallsStatus,
  walletShowCallsStatus,
  walletSendCalls,
];
