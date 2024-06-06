import { RpcRequestInput } from './RpcRequestInput';

const nfc: RpcRequestInput = {
  method: 'wallet_requestNFCPayment',
  params: [
    { key: 'receiverName', required: true },
    { key: 'receiverAddress', required: true },
    { key: 'amount', required: true },
    { key: 'chainId', required: true },
    { key: 'chainAsset', required: true },
  ],
  format: (data: Record<string, string>) => [
    {
      receiverName: data.receiverName,
      receiverAddress: data.receiverAddress,
      amount: data.amount,
      chainId: data.chainId,
      chainAsset: data.chainAsset,
    },
  ],
};

export const nfcMethods = [nfc];
