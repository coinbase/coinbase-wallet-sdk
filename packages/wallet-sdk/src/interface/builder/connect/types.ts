import type { WalletConnectResult } from ':core/rpc/wallet_connect.js';
import type { Caip25RequestScope } from ':core/rpc/wallet_createSession.js';
import type { Session } from ':core/session/types.js';
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

/** One requested chain, built from the dapp's option for it. */
export type ChainConnector = {
  /** This chain's part of the single CAIP-25 popup request. */
  scopes: Record<string, Caip25RequestScope>;
  /** True when the stored session can't answer this request, so the wallet must be asked. */
  needsPopup(stored: Session | undefined): boolean;
  /** This chain's entry in the result, once the wallet approved or the stored session was reused. */
  readResult(session: Session): Promise<ConnectResult>;
  /** This chain's entry in the result, from the Coinbase Wallet host's own wallet. */
  connectHost(): Promise<ConnectResult>;
};
