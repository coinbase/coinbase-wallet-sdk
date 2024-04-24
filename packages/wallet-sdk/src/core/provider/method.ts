type Mapping = {
  fetch: string;
  sign: SignMethod;
  state: StateMethod;
  filter: FilterMethod;
  deprecated: DeprecatedMethod;
  unsupported: UnsupportedMethod;
};

export type MethodCategory = keyof Mapping;
export type Method<C extends MethodCategory> = Mapping[C];

type SignMethod =
  | 'eth_requestAccounts'
  | 'eth_ecRecover'
  | 'personal_sign'
  | 'personal_ecRecover'
  | 'eth_signTransaction'
  | 'eth_sendTransaction'
  | 'eth_signTypedData_v1'
  | 'eth_signTypedData_v3'
  | 'eth_signTypedData_v4'
  | 'eth_signTypedData'
  | 'wallet_addEthereumChain'
  | 'wallet_switchEthereumChain'
  | 'wallet_watchAsset'
  | 'wallet_getCapabilities'
  | 'wallet_sendCalls';

type StateMethod = 'eth_chainId' | 'eth_accounts' | 'eth_coinbase' | 'net_version';

type FilterMethod =
  | 'eth_newFilter'
  | 'eth_newBlockFilter'
  | 'eth_newPendingTransactionFilter'
  | 'eth_getFilterChanges'
  | 'eth_getFilterLogs'
  | 'eth_uninstallFilter';

type DeprecatedMethod = 'eth_sign' | 'eth_signTypedData_v2';

type UnsupportedMethod = 'eth_subscribe' | 'eth_unsubscribe';
