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

export type SolanaInvokeRequest =
  | SolanaSignMessageRequest
  | SolanaSignTransactionRequest
  | SolanaSignAndSendTransactionRequest
  | SolanaSignAndSendAllTransactionsRequest;
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

export type SolanaInvokeResult =
  | SolanaSignMessageResult
  | SolanaSignTransactionResult
  | SolanaSignAndSendTransactionResult
  | SolanaSignAndSendAllTransactionsResult;

export type SolanaInvokeResultFor<Request extends SolanaInvokeRequest> =
  Request extends SolanaSignMessageRequest
    ? SolanaSignMessageResult
    : Request extends SolanaSignTransactionRequest
      ? SolanaSignTransactionResult
      : Request extends SolanaSignAndSendTransactionRequest
        ? SolanaSignAndSendTransactionResult
        : SolanaSignAndSendAllTransactionsResult;
