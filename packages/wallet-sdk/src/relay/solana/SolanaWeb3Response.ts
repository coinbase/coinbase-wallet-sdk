// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

export enum SolanaWeb3Response {
  connectionSuccess = "solanaConnectionSuccess",
  connectionDeny = "solanaConnectionDeny",
  signMessageSuccess = "signSolanaMessageSuccess",
  signMessageDeny = "signSolanaMessageDeny",
  sendTransactionSuccess = "sendSolanaTransactionSuccess",
  sendTransactionDeny = "sendSolanaTransactionDeny",
  signTransactionSuccess = "signSolanaTransactionSuccess",
  signTransactionDeny = "signaSolanaTransactionDeny",
  signAllTransactionsSuccess = "signAllSolanaTransactionsSuccess",
  signAllTransactionsDeny = "signAllSolanaTransactionsDeny",
  parentDisconnected = "parentDisconnected",
  featureFlagOff = "featureFlagOff",
  web3RequestCanceled = "web3RequestCanceled",
}
