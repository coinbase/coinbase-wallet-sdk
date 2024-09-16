import { ShortcutType } from './ShortcutType';

const walletSwitchEthereumChainShortcuts: ShortcutType[] = [
  {
    key: 'Ethereum',
    data: {
      chainId: '1',
    },
  },
  {
    key: 'Base',
    data: {
      chainId: '8453',
    },
  },
  {
    key: 'Base Sepolia',
    data: {
      chainId: '84532',
    },
  },
  {
    key: 'Harmony',
    data: {
      chainId: '1666600000',
    },
  },
];

const walletAddEthereumChainShortcuts: ShortcutType[] = [
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
];

const walletWatchAsset: ShortcutType[] = [
  {
    key: 'WONE on Harmony',
    data: {
      type: 'ERC20',
      contractAddress: '0xcf664087a5bb0237a0bad6742852ec6c8d69a27a',
      symbol: 'WONE',
      decimals: '18',
    },
  },
];

export const multiChainShortcutsMap = {
  wallet_switchEthereumChain: walletSwitchEthereumChainShortcuts,
  wallet_addEthereumChain: walletAddEthereumChainShortcuts,
  wallet_watchAsset: walletWatchAsset,
};
