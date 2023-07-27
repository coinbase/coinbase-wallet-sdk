// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

export enum Web3Method {
  requestEthereumAccounts = 'requestEthereumAccounts',
  signEthereumMessage = 'signEthereumMessage',
  signEthereumTransaction = 'signEthereumTransaction',
  submitEthereumTransaction = 'submitEthereumTransaction',
  ethereumAddressFromSignedMessage = 'ethereumAddressFromSignedMessage',
  scanQRCode = 'scanQRCode',
  generic = 'generic',
  childRequestEthereumAccounts = 'childRequestEthereumAccounts',
  addEthereumChain = 'addEthereumChain',
  switchEthereumChain = 'switchEthereumChain',
  makeEthereumJSONRPCRequest = 'makeEthereumJSONRPCRequest',
  watchAsset = 'watchAsset',
  selectProvider = 'selectProvider',
  connectAndSignIn = 'connectAndSignIn',
}
