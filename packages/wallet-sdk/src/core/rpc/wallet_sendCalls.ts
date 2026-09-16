import { Hex } from 'viem';

export type GasLimitOverrideCallCapability = {
  value: Hex;
};

export type GasLimitOverrideCapability = {
  supported: boolean;
};

export type CallCapabilities = {
  gasLimitOverride?: GasLimitOverrideCallCapability;
  [key: string]: unknown;
};

export type WalletSendCallsCall = {
  to: Hex;
  data?: Hex;
  value?: Hex;
  capabilities?: CallCapabilities;
};

export type WalletSendCallsParams = [
  {
    version: string;
    chainId: Hex;
    from: Hex;
    calls: WalletSendCallsCall[];
    atomicRequired?: boolean;
    capabilities?: Record<string, unknown>;
  },
];

export type WalletSendCallsSchema = {
  Method: 'wallet_sendCalls';
  Parameters: WalletSendCallsParams;
  ReturnType: Hex;
};
