import { RpcMethod } from '../RpcMethod';

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
    {
      key: 'OP Mainnet',
      data: {
        chainId: '10',
      },
    },
    {
      key: 'Arbitrum',
      data: {
        chainId: '42161',
      },
    },
    {
      key: 'Harmony',
      data: {
        chainId: '1666600000',
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
  shortcuts: [
    {
      key: 'Harmony',
      data: {
        chainId: '1666600000',
        chainName: 'Harmony Mainnet',
        currencyName: 'ONE',
        currencySymbol: 'ONE',
        decimals: '18',
        rpcUrl: 'https://api.harmony.one',
        blockExplorerUrl: 'https://explorer.harmony.one',
        iconUrl: '',
      },
    },
  ],
};

const walletWatchAsset = {
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
  shortcuts: [
    {
      key: 'WONE on Harmony',
      data: {
        type: 'ERC20',
        contractAddress: '0xcf664087a5bb0237a0bad6742852ec6c8d69a27a',
        symbol: 'WONE',
        decimals: '18',
      },
    },
  ],
};

export const multiChainMethods: RpcMethod[] = [
  walletSwitchEthereumChain,
  walletAddEthereumChain,
  walletWatchAsset,
];
