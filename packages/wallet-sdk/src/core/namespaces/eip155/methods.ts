/**
 * Methods requested in the eip155 CAIP-25 session scope.
 *
 * This doubles as the routing rule: anything the session asked the wallet to authorize
 * goes through `invoke` → wallet transport, and everything else (`eth_call`,
 * `eth_getBalance`, `wallet_getCallsStatus`) hits `chain.rpcUrl` instead. The few that
 * never reach that check — `eth_accounts`, `wallet_switchEthereumChain` — have their own
 * cases in `handleConnected`.
 */
export const EIP155_METHODS: readonly string[] = [
  'eth_accounts',
  'personal_sign',
  'personal_ecRecover',
  'eth_ecRecover',
  'eth_sendTransaction',
  'eth_signTransaction',
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_sendCalls',
  'wallet_showCallsStatus',
  'wallet_sign',
  'wallet_grantPermissions',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
  'wallet_watchAsset',
  'wallet_connect',
  'experimental_requestInfo',
  'coinbase_signPreparedCalls',
];
