import type { WalletAccount } from '@wallet-standard/base';

export const CoinbaseSignPreparedCalls = 'coinbase:signPreparedCalls';

/**
 * Listed only while the session grants `coinbase_signPreparedCalls`, which the wallet does for
 * first-party apps alone.
 */
export type CoinbaseSignPreparedCallsFeature = {
  readonly [CoinbaseSignPreparedCalls]: {
    readonly version: '1.0.0';
    /** Every field besides `account` passes through; the wallet owns their shape and the result. */
    readonly signPreparedCalls: (input: {
      readonly account: WalletAccount;
      readonly [key: string]: unknown;
    }) => Promise<unknown>;
  };
};
