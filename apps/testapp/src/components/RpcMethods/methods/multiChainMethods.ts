import { RpcMethod } from '../RpcMethod';

const ethChainId = {
  method: 'eth_chainId',
  params: [],
};

const walletSwitchEthereumChain = {
  method: 'wallet_switchEthereumChain',
  params: [{ key: 'chainId', required: true }],
  format: (data: Record<string, string>) => [
    {
      chainId: `0x${Number(data.chainId).toString(16)}`,
    },
  ],
  shortcuts: [
    {
      key: 'Ethereum',
      data: {
        chainId: '1',
      },
    },
  ],
};

const walletAddEthereumChain = {
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
  format: (data: Record<string, string>) => [
    {
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
    },
  ],
};

const walletWatchAsset = {
  method: 'wallet_watchAsset',
  params: [
    { key: 'address', required: true },
    { key: 'symbol', required: false },
    { key: 'decimals', required: false },
  ],
  format: (data: Record<string, string>) => [
    {
      // eslint-disable-next-line prettier/prettier
      type: "ERC20",
      options: {
        address: data.address,
        symbol: data.symbol,
        decimals: Number(data.decimals),
      },
    },
  ],
};

export const multiChainMethods: RpcMethod[] = [
  ethChainId,
  walletSwitchEthereumChain,
  walletAddEthereumChain,
  walletWatchAsset,
];
