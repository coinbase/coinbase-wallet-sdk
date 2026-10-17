import type {
  SolanaSignAndSendAllTransactionsOptions,
  SolanaSignAndSendTransactionOptions,
  SolanaSignTransactionOptions,
} from '@solana/wallet-standard-features';

export type SolanaConnectRequest = {
  method: 'connect';
};

export type SolanaDisconnectRequest = {
  method: 'disconnect';
};

export type SolanaSignMessageRequest = {
  method: 'solana_signMessage';
  params: {
    pubkey: string;
    message: Uint8Array;
  };
};

export type SolanaSignTransactionRequest = {
  method: 'solana_signTransaction';
  params: {
    pubkey: string;
    transaction: Uint8Array;
    options?: SolanaSignTransactionOptions;
  };
};

export type SolanaSignAndSendTransactionRequest = {
  method: 'solana_signAndSendTransaction';
  params: {
    pubkey: string;
    transaction: Uint8Array;
    options?: SolanaSignAndSendTransactionOptions;
  };
};

export type SolanaSignAndSendAllTransactionsRequest = {
  method: 'solana_signAndSendAllTransactions';
  params: {
    inputs: {
      pubkey: string;
      transaction: Uint8Array;
      options?: SolanaSignAndSendTransactionOptions;
    }[];
    options?: SolanaSignAndSendAllTransactionsOptions;
  };
};

/**
 * Sign and submit transactions the backend already prepared.
 *
 * `pubkey` names the signer, like every other Solana signing method, and must be a session
 * account. Every other field passes through unchanged; the wallet owns its shape.
 */
export type CoinbaseSignPreparedCallsRequest = {
  method: 'coinbase_signPreparedCalls';
  params: readonly [{ pubkey: string; [key: string]: unknown }];
};

export type SolanaInvokeRequest =
  | SolanaSignMessageRequest
  | SolanaSignTransactionRequest
  | SolanaSignAndSendTransactionRequest
  | SolanaSignAndSendAllTransactionsRequest
  | CoinbaseSignPreparedCallsRequest;
export type SolanaRequest = SolanaConnectRequest | SolanaDisconnectRequest | SolanaInvokeRequest;

export type SolanaSignMessageResult = {
  signature: Uint8Array;
  signedMessage?: Uint8Array;
};

export type SolanaSignTransactionResult = {
  signedTransaction: Uint8Array;
};

export type SolanaSignAndSendTransactionResult = {
  signature: Uint8Array;
};

export type SolanaSignAndSendAllTransactionsResult =
  PromiseSettledResult<SolanaSignAndSendTransactionResult>[];

/** Passed through exactly as the wallet returned it; the caller owns its shape. */
export type CoinbaseSignPreparedCallsResult = unknown;

export type SolanaInvokeResult =
  | SolanaSignMessageResult
  | SolanaSignTransactionResult
  | SolanaSignAndSendTransactionResult
  | SolanaSignAndSendAllTransactionsResult
  | CoinbaseSignPreparedCallsResult;

export type SolanaInvokeResultFor<Request extends SolanaInvokeRequest> =
  Request extends SolanaSignMessageRequest
    ? SolanaSignMessageResult
    : Request extends SolanaSignTransactionRequest
      ? SolanaSignTransactionResult
      : Request extends SolanaSignAndSendTransactionRequest
        ? SolanaSignAndSendTransactionResult
        : Request extends SolanaSignAndSendAllTransactionsRequest
          ? SolanaSignAndSendAllTransactionsResult
          : CoinbaseSignPreparedCallsResult;
