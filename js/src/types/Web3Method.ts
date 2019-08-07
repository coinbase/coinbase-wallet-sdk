// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

export enum Web3Method {
  requestEthereumAccounts = "requestEthereumAccounts",
  signEthereumMessage = "signEthereumMessage",
  signEthereumTransaction = "signEthereumTransaction",
  submitEthereumTransaction = "submitEthereumTransaction",
  ethereumAddressFromSignedMessage = "ethereumAddressFromSignedMessage",
  scanQRCode = "scanQRCode",
  arbitrary = "arbitrary"
}
