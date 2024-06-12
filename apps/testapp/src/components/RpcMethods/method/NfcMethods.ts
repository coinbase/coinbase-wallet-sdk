import { RpcRequestInput } from './RpcRequestInput';

const requestNfc: RpcRequestInput = {
  method: 'requestNFCPayment',
  params: [{ key: 'calldata', required: true }],
  format: (data: Record<string, string>) => [
    {
      calldata: data.calldata,
    },
  ],
};

const hasNfc: RpcRequestInput = {
  method: 'hasNFCPayment',
  params: [],
  format: () => [],
};

export const nfcMethods = [requestNfc, hasNfc];
