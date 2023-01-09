// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { SendOptions, Signer, Transaction } from "@solana/web3.js";

import { SolanaWeb3Method } from "./SolanaWeb3Method";

interface BaseSolanaWeb3Request<
  Method extends SolanaWeb3Method,
  Params extends object = Record<string, unknown>,
> {
  method: Method;
  params: Params;
}

// this is for consistency with solana-labs/wallet-adapter
interface SendTransactionOptions extends SendOptions {
  signers?: Signer[];
}

export type SolanaSignTransactionRequest = BaseSolanaWeb3Request<
  SolanaWeb3Method.signTransaction,
  {
    transactions: Transaction[];
  }
>;

export type SolanaSignAllTransactionsRequest = BaseSolanaWeb3Request<
  SolanaWeb3Method.signAllTransactions,
  {
    transactions: Transaction[];
  }
>;

export type SolanaSignMessageRequest = BaseSolanaWeb3Request<
  SolanaWeb3Method.signMessage,
  {
    address: string;
    message: string;
  }
>;

export type SolanaSendTransactionRequest = BaseSolanaWeb3Request<
  SolanaWeb3Method.sendTransaction,
  {
    transactions: Transaction[];
    options: SendTransactionOptions;
  }
>;

export type SolanaTransactionRequest =
  | SolanaSignTransactionRequest
  | SolanaSendTransactionRequest
  | SolanaSignAllTransactionsRequest;
