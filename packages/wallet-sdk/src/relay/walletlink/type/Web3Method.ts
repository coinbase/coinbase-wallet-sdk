// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

export const web3Methods = [
  'requestEthereumAccounts',
  'signEthereumMessage',
  'signEthereumTransaction',
  'submitEthereumTransaction',
  'ethereumAddressFromSignedMessage',
  'scanQRCode',
  'generic',
  'childRequestEthereumAccounts',
  'addEthereumChain',
  'switchEthereumChain',
  'makeEthereumJSONRPCRequest',
  'watchAsset',
  'selectProvider',
  'connectAndSignIn',
] as const;

export type Web3Method = (typeof web3Methods)[number];
