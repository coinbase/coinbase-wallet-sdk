import { RpcRequestInput } from './RpcRequestInput';

const walletSwitchEthereumChain: RpcRequestInput = {
  method: 'wallet_switchEthereumChain',
  params: [{ key: 'chainId', required: true }],
  format: (data: Record<string, string>) => [
    {
      chainId: `0x${Number(data.chainId).toString(16)}`,
    },
  ],
};

const walletAddEthereumChain: RpcRequestInput = {
  method: 'wallet_addEthereumChain',
  params: [
    { key: 'chainId', required: true },
    { key: 'chainName', required: true },
    { key: 'currencyName', required: true },
    { key: 'currencySymbol', required: true },
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
        name: data.currencyName,
        symbol: data.currencySymbol,
        decimals: 18,
      },
    },
  ],
};

const walletWatchAsset: RpcRequestInput = {
  method: 'wallet_watchAsset',
  params: [
    { key: 'type', required: true },
    { key: 'contractAddress', required: true },
    { key: 'symbol', required: false },
    { key: 'decimals', required: false },
    { key: 'tokenId', required: false },
  ],
  format: (data: Record<string, string>) => [
    {
      type: data.type,
      options: {
        address: data.contractAddress,
        symbol: data.symbol,
        decimals: Number(data.decimals),
        tokenId: data.tokenId,
      },
    },
  ],
};

export const multiChainMethods = [
  walletSwitchEthereumChain,
  walletAddEthereumChain,
  walletWatchAsset,
];
