// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

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
  'watchAsset',
  'selectProvider',
  'connectAndSignIn',
] as const;

export type Web3Method = (typeof web3Methods)[number];
