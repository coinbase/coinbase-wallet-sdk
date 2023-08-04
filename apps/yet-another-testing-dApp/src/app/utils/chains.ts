import type { AddEthereumChainParameter as Web3ReactAddEthereumChainParameter } from "@web3-react/types";

interface AddEthereumChainParameter {
  chainId: string;
  blockExplorerUrls?: string[];
  chainName?: string;
  iconUrls?: string[];
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls?: string[];
}

const ETH: Web3ReactAddEthereumChainParameter["nativeCurrency"] = {
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
};

const MATIC: Web3ReactAddEthereumChainParameter["nativeCurrency"] = {
  name: "Matic",
  symbol: "MATIC",
  decimals: 18,
};

const CELO: Web3ReactAddEthereumChainParameter["nativeCurrency"] = {
  name: "Celo",
  symbol: "CELO",
  decimals: 18,
};

interface BasicChainInformation {
  urls: string[];
  name: string;
}

interface ExtendedChainInformation extends BasicChainInformation {
  nativeCurrency: Web3ReactAddEthereumChainParameter["nativeCurrency"];
  blockExplorerUrls: Web3ReactAddEthereumChainParameter["blockExplorerUrls"];
}

function isExtendedChainInformation(
  chainInformation: BasicChainInformation | ExtendedChainInformation,
): chainInformation is ExtendedChainInformation {
  return !!(chainInformation as ExtendedChainInformation).nativeCurrency;
}

export function getAddChainParameters(chainId: number): AddEthereumChainParameter {
  const chainInformation = CHAINS[chainId];
  const chainIdHex = `0x${chainId.toString(16)}`;
  if (isExtendedChainInformation(chainInformation)) {
    return {
      chainId: chainIdHex,
      chainName: chainInformation.name,
      nativeCurrency: chainInformation.nativeCurrency,
      rpcUrls: chainInformation.urls,
      blockExplorerUrls: chainInformation.blockExplorerUrls,
    };
  } else {
    return { chainId: chainIdHex };
  }
}

export function getWeb3ReactAddChainParameters(
  chainId: number,
): Web3ReactAddEthereumChainParameter | number {
  const chainInformation = CHAINS[chainId];
  if (isExtendedChainInformation(chainInformation)) {
    return {
      chainId,
      chainName: chainInformation.name,
      nativeCurrency: chainInformation.nativeCurrency,
      rpcUrls: chainInformation.urls,
      blockExplorerUrls: chainInformation.blockExplorerUrls,
    };
  } else {
    return chainId;
  }
}

type ChainConfig = { [chainId: number]: BasicChainInformation | ExtendedChainInformation };

export const MAINNET_CHAINS: ChainConfig = {
  1: {
    urls: ["https://cloudflare-eth.com"].filter(Boolean),
    name: "Mainnet",
  },
  10: {
    urls: ["https://mainnet.optimism.io"].filter(Boolean),
    name: "Optimism",
    nativeCurrency: ETH,
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
  },
  8453: {
    urls: ["https://developer-access-mainnet.base.org"],
    name: "Base",
    nativeCurrency: ETH,
    blockExplorerUrls: ["https://explorer.base.org"],
  },
  42161: {
    urls: ["https://arb1.arbitrum.io/rpc"].filter(Boolean),
    name: "Arbitrum One",
    nativeCurrency: ETH,
    blockExplorerUrls: ["https://arbiscan.io"],
  },
  137: {
    urls: ["https://polygon-rpc.com"].filter(Boolean),
    name: "Polygon Mainnet",
    nativeCurrency: MATIC,
    blockExplorerUrls: ["https://polygonscan.com"],
  },
};

export const TESTNET_CHAINS: ChainConfig = {
  5: {
    urls: ["https://ethereum-goerli.publicnode.com"].filter(Boolean),
    name: "Görli",
  },
  420: {
    urls: ["https://goerli.optimism.io"].filter(Boolean),
    name: "Optimism Goerli",
    nativeCurrency: ETH,
    blockExplorerUrls: ["https://goerli-explorer.optimism.io"],
  },
  84531: {
    urls: ["https://developer-access-mainnet.base.org"],
    name: "Base Goerli",
    nativeCurrency: ETH,
    blockExplorerUrls: ["https://goerli-explorer.base.org"],
  },
  421613: {
    urls: ["https://goerli-rollup.arbitrum.io/rpc"].filter(Boolean),
    name: "Arbitrum Goerli",
    nativeCurrency: ETH,
    blockExplorerUrls: ["https://testnet.arbiscan.io"],
  },
  80001: {
    urls: ["https://polygon-mumbai-bor.publicnode.com"].filter(Boolean),
    name: "Polygon Mumbai",
    nativeCurrency: MATIC,
    blockExplorerUrls: ["https://mumbai.polygonscan.com"],
  },
};

export const UNSUPPORTED_CHAINS: ChainConfig = {
  42220: {
    urls: ["https://forno.celo.org"],
    name: "Celo",
    nativeCurrency: CELO,
    blockExplorerUrls: ["https://explorer.celo.org"],
  },
  44787: {
    urls: ["https://alfajores-forno.celo-testnet.org"],
    name: "Celo Alfajores",
    nativeCurrency: CELO,
    blockExplorerUrls: ["https://alfajores-blockscout.celo-testnet.org"],
  },
};

export const WHITELISTED_CHAINS: ChainConfig = {
  ...MAINNET_CHAINS,
  ...TESTNET_CHAINS,
};

export const CHAINS: ChainConfig = {
  ...MAINNET_CHAINS,
  ...TESTNET_CHAINS,
  ...UNSUPPORTED_CHAINS,
};

export const URLS: { [chainId: number]: string[] } = Object.keys(CHAINS).reduce<{
  [chainId: number]: string[];
}>((accumulator, chainId) => {
  const validURLs: string[] = CHAINS[Number(chainId)].urls;

  if (validURLs.length) {
    accumulator[Number(chainId)] = validURLs;
  }

  return accumulator;
}, {});

export const mainnetChainIds = Object.keys(MAINNET_CHAINS).map(Number);
export const testnetChainIds = Object.keys(TESTNET_CHAINS).map(Number);
export const whiteListedChainIds = Object.keys(WHITELISTED_CHAINS).map(Number);
export const unSupportedChainIds = Object.keys(UNSUPPORTED_CHAINS).map(Number);
export const defaultChainId = whiteListedChainIds[0];
