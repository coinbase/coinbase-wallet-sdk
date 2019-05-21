// Copyright (c) 2018-2019 Coinbase, Inc. <https://coinbase.com/>
// Licensed under the Apache License, version 2.0

export enum WalletLinkMethod {
  requestEthereumAddresses = "requestEthereumAddresses",
  signEthereumMessage = "signEthereumMessage",
  signEthereumTransaction = "signEthereumTransaction",
  submitEthereumTransaction = "submitEthereumTransaction",
  ethereumAddressFromSignedMessage = "ethereumAddressFromSignedMessage",
  scanQRCode = "scanQRCode"
}
