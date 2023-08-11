export type RpcMethod = {
  connected?: boolean;
  method: string;
  params: Array<{ key: string; required?: boolean }>;
  format?: (data: Record<string, string>) => Record<string, string>;
};

const ethRequestAccounts = {
  method: 'eth_requestAccounts',
  params: [],
};

const ethAccounts = {
  method: 'eth_accounts',
  params: [],
};

const switchEthereumChain = {
  method: 'wallet_switchEthereumChain',
  params: [{ key: 'chainId', required: true }],
  format: (data: Record<string, string>) => ({
    chainId: `0x${Number(data.chainId).toString(16)}`,
  }),
};

const addEthereumChain = {
  connected: true,
  method: 'wallet_addEthereumChain',
  params: [
    { key: 'chainId', required: true },
    { key: 'chainName', required: true },
    { key: 'name', required: true },
    { key: 'symbol', required: true },
    { key: 'decimals', required: true },
    { key: 'rpcUrl', required: true },
    { key: 'blockExplorerUrl' },
    { key: 'iconUrl' },
  ],
  format: (data: Record<string, string>) => ({
    chainId: `0x${Number(data.chainId).toString(16)}`,
    chainName: data.chainName,
    rpcUrls: [data.rpcUrl],
    blockExplorerUrls: [data.blockExplorerUrls],
    iconUrls: [data.iconUrl],
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  }),
};

const personal_sign = {
  method: 'personal_sign',
  params: [
    { key: 'message', required: true },
    { key: 'address', required: true },
  ],
  format: (data: Record<string, string>) => [Buffer.from(data.message, 'utf8'), data.address],
};

export const methods: RpcMethod[] = [
  ethRequestAccounts,
  ethAccounts,
  addEthereumChain,
  switchEthereumChain,
  personal_sign,
];
