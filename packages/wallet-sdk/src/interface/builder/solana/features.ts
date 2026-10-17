import {
  SignAndSendAllTransactions,
  type SolanaSignAndSendAllTransactionsFeature,
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from '@solana/wallet-standard-features';
import type { IdentifierString, Wallet, WalletAccount } from '@wallet-standard/base';
import type {
  StandardConnectFeature,
  StandardDisconnectFeature,
  StandardEventsFeature,
} from '@wallet-standard/features';

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

export type RequiredSolanaFeatures = StandardConnectFeature &
  StandardDisconnectFeature &
  StandardEventsFeature &
  SolanaSignMessageFeature &
  SolanaSignTransactionFeature &
  SolanaSignAndSendTransactionFeature &
  SolanaSignAndSendAllTransactionsFeature;

/** Each is listed only while the session grants the method behind it. */
export type OptionalSolanaFeatures = CoinbaseSignPreparedCallsFeature;

export type SolanaWallet = Wallet & {
  features: Wallet['features'] & RequiredSolanaFeatures & Partial<OptionalSolanaFeatures>;
};

/** An account lists whichever of these the wallet currently lists. */
export const ACCOUNT_FEATURES: readonly IdentifierString[] = [
  SolanaSignMessage,
  SolanaSignTransaction,
  SolanaSignAndSendTransaction,
  SignAndSendAllTransactions,
  CoinbaseSignPreparedCalls,
];
