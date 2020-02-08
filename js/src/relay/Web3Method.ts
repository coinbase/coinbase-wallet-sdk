// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
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
