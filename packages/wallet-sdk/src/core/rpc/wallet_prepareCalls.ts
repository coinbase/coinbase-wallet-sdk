import { Hex } from 'viem';

import type { CallCapabilities } from './wallet_sendCalls.js';

export type PrepareCallsCall = {
  to: Hex;
  data: Hex;
  value: Hex;
  capabilities?: CallCapabilities;
};

export type PrepareCallsParams = [
  {
    from: Hex;
    chainId: Hex;
    calls: PrepareCallsCall[];
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
