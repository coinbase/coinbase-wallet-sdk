import { Hex } from 'viem';

export type PrepareCallsParams = [
  {
    from: Hex;
    chainId: Hex;
    calls: {
      to: Hex;
      data: Hex;
      value: Hex;
    }[];
    capabilities: Record<string, unknown>;
  },
];

export type PrepareCallsReturnValue = {
  type: string;
  chainId: Hex;
  signatureRequest: {
    hash: Hex;
  };
  capabilities: Record<string, unknown>;
  userOp: unknown;
};

export type PrepareCallsSchema = {
  Method: 'wallet_prepareCalls';
  Parameters: PrepareCallsParams;
  ReturnType: PrepareCallsReturnValue;
};
