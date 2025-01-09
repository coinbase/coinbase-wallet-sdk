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

const walletSignEphemeral: RpcRequestInput = {
  method: 'wallet_sign',
  params: [{ key: 'message', required: true }],
  format: (data: Record<string, string>) => [
    `0x${Buffer.from(data.message, 'utf8').toString('hex')}`,
  ],
};

export const ephemeralMethods = [walletSendCallsEphemeral, walletSignEphemeral];
