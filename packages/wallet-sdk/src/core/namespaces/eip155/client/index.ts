import { Chain, createPublicClient, defineChain, http, PublicClient } from 'viem';
import { BundlerClient, createBundlerClient } from 'viem/account-abstraction';
import {
  arbitrum,
  avalanche,
  base,
  baseSepolia,
  bsc,
  mainnet,
  optimism,
  optimismSepolia,
  polygon,
  sepolia,
  zora,
} from 'viem/chains';

import { ChainClients } from './store.js';

export type SDKNativeCurrency = {
  name?: string;
  symbol?: string;
  decimal?: number;
};

export type SDKChain = {
  id: number;
  rpcUrl?: string;
  nativeCurrency?: SDKNativeCurrency;
};

export const SUPPORTED_MAINNET_CHAINS: [Chain, ...Chain[]] = [
  base,
  avalanche,
  arbitrum,
  polygon,
  mainnet,
  bsc,
  zora,
  optimism,
];

export const SUPPORTED_TESTNET_CHAINS: [Chain, ...Chain[]] = [
  baseSepolia,
  sepolia,
  optimismSepolia,
];

const SUPPORTED_CHAINS_BY_ID: Map<number, Chain> = [
  ...SUPPORTED_MAINNET_CHAINS,
  ...SUPPORTED_TESTNET_CHAINS,
].reduce((acc, chain) => {
  acc.set(chain.id, chain);
  return acc;
}, new Map<number, Chain>());

// Get fallback chain data from supported chain list
function getSupportedChainById(chainId: number): Chain | undefined {
  return SUPPORTED_CHAINS_BY_ID.get(chainId);
}

// Get fallback RPC URL from viem's chain definitions
function getFallbackRpcUrl(chainId: number): string | undefined {
  const viemChain = getSupportedChainById(chainId);
  if (viemChain?.rpcUrls?.default?.http?.[0]) {
    return viemChain.rpcUrls.default.http[0];
  }
  return undefined;
}

function defineChainConfig(
  chainId: number,
  rpcUrl: string,
  options?: {
    viemChain?: Chain;
    nativeCurrency?: SDKNativeCurrency;
  }
): Chain {
  const viemChain = options?.viemChain;
  const nativeCurrency = options?.nativeCurrency;

  const name = nativeCurrency?.name ?? viemChain?.name ?? '';
  const symbol = nativeCurrency?.symbol ?? viemChain?.nativeCurrency?.symbol ?? '';
  const decimals = nativeCurrency?.decimal ?? viemChain?.nativeCurrency?.decimals ?? 18;

  return defineChain({
    id: chainId,
    name,
    nativeCurrency: {
      name,
      symbol,
      decimals,
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
    contracts: viemChain?.contracts,
  });
}

export function createClients(chains: SDKChain[]) {
  chains.forEach((c) => {
    // Use fallback RPC URL from viem if wallet hasn't provided one
    let rpcUrl = c.rpcUrl;
    if (!rpcUrl) {
      rpcUrl = getFallbackRpcUrl(c.id);
    }

    // Skip if still no RPC URL available
    if (!rpcUrl) {
      return;
    }

    const viemChain = getSupportedChainById(c.id);
    const clients = createClientPair({
      chainId: c.id,
      rpcUrl,
      nativeCurrency: c.nativeCurrency,
      viemChain,
    });

    storeClientPair(c.id, clients);
  });
}

type ClientPair = {
  client: PublicClient;
  bundlerClient: BundlerClient;
};

function createClientPair(options: {
  chainId: number;
  rpcUrl: string;
  nativeCurrency?: SDKNativeCurrency;
  viemChain?: Chain;
}): ClientPair {
  const { chainId, rpcUrl, nativeCurrency, viemChain } = options;
  const chain = defineChainConfig(chainId, rpcUrl, {
    viemChain,
    nativeCurrency,
  });

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const bundlerClient = createBundlerClient({
    client,
    transport: http(rpcUrl),
  });

  return { client, bundlerClient };
}

function createFallbackClientPair(chainId: number): ClientPair | undefined {
  const rpcUrl = getFallbackRpcUrl(chainId);
  const viemChain = getSupportedChainById(chainId);

  if (!rpcUrl) {
    return undefined;
  }

  return createClientPair({
    chainId,
    rpcUrl,
    viemChain,
  });
}

function storeClientPair(chainId: number, pair: ClientPair) {
  ChainClients.setState((state) => ({
    ...state,
    [chainId]: {
      client: pair.client,
      bundlerClient: pair.bundlerClient,
    },
  }));
}

export function getClient(chainId: number): PublicClient | undefined {
  // First check if client exists in storage
  const storedClient = ChainClients.getState()[chainId]?.client;
  if (storedClient) {
    return storedClient;
  }

  // If not in storage, try to create a fallback client
  const fallbackPair = createFallbackClientPair(chainId);

  // If we successfully created fallback clients, store them for future use
  if (fallbackPair) {
    storeClientPair(chainId, fallbackPair);
    return fallbackPair.client;
  }

  return undefined;
}
