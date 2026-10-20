import type { WalletConnectResult } from ':core/rpc/wallet_connect.js';
import type { StandardConnectOutput } from '@wallet-standard/features';

export type EvmConnectOption = true | { capabilities?: Record<string, unknown> };

export type ConnectOptions = {
  evm?: EvmConnectOption;
  solana?: true;
};

/** `evm` is the `wallet_connect` response; `solana` is the Wallet Standard `connect` output. */
export type ConnectResult = {
  evm?: WalletConnectResult;
  solana?: StandardConnectOutput;
};
