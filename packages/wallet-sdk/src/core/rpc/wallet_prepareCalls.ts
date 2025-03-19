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
    capabilities: Record<string, any>;
  },
];

export type PrepareCallsReturnValue = {
  type: string;
  chainId: `0x${string}`;
  signatureRequest: {
    hash: `0x${string}`;
  };
  capabilities: Record<string, any>;
  userOp: any;
};

export type PrepareCallsSchema = {
  Method: 'wallet_prepareCalls';
  Parameters: PrepareCallsParams;
  ReturnType: PrepareCallsReturnValue;
};
