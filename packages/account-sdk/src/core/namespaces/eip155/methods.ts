/** Methods that must go to the keys popup rather than the chain RPC URL. */
export const POPUP_METHODS = new Set<string>([
  'personal_sign',
  'personal_ecRecover',
  'eth_ecRecover',
  'eth_signTransaction',
  'eth_sendTransaction',
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_sign',
  'wallet_sendCalls',
  'wallet_showCallsStatus',
  'wallet_grantPermissions',
  'wallet_addEthereumChain',
  'wallet_watchAsset',
  'wallet_connect',
]);
