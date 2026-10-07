import { parseMessage } from '../shortcut/ShortcutType';
import { RpcRequestInput } from './RpcRequestInput';

const walletSendCallsEphemeral: RpcRequestInput = {
  method: 'wallet_sendCalls',
  params: [
    { key: 'version', required: true },
    { key: 'chainId', required: true },
    { key: 'calls', required: true },
  ],
  format: (data: Record<string, string>) => [
    {
      chainId: data.chainId,
      calls: data.calls,
      version: data.version,
    },
  ],
};

const walletSignOldSpecEphemeral: RpcRequestInput = {
  method: 'wallet_sign#old',
  params: [
    { key: 'version', required: true },
    { key: 'type', required: true },
    { key: 'address', required: false },
    { key: 'data', required: true },
    { key: 'capabilities', required: false },
    { key: 'mutableData', required: false },
  ],
  format: (data: Record<string, string>) => [
    {
      version: data.version,
      type: data.type,
      address: data.address,
      data: parseMessage(data.data),
      capabilities: data.capabilities,
      mutableData: data.mutableData,
    },
  ],
};

const walletSignNewSpecEphemeral: RpcRequestInput = {
  method: 'wallet_sign#new',
  params: [
    { key: 'version', required: true },
    { key: 'request', required: true },
    { key: 'address', required: false },
    { key: 'capabilities', required: false },
    { key: 'mutableData', required: false },
  ],
  format: (data: Record<string, string>) => [
    {
      version: data.version,
      request: parseMessage(data.request),
      address: data.address,
      capabilities: data.capabilities,
      mutableData: data.mutableData,
    },
  ],
};

export const ephemeralMethods = [
  walletSendCallsEphemeral,
  walletSignOldSpecEphemeral,
  walletSignNewSpecEphemeral,
];
