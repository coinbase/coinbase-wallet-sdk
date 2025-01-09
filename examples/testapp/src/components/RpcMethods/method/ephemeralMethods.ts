import { RpcRequestInput } from './RpcRequestInput';

const walletSignEphemeral: RpcRequestInput = {
  method: 'wallet_sign',
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

export const ephemeralMethods = [walletSignEphemeral];
