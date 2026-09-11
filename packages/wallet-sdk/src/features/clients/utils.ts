import { createPublicClient, defineChain, http, PublicClient } from 'viem';
import { BundlerClient, createBundlerClient } from 'viem/account-abstraction';

import { ChainClients } from './state.js';
import { Chain as SCWChain } from ':sign/scw/types.js';

export function createClients(chains: SCWChain[]) {
  chains.forEach((chain) => {
    if (!chain.rpcUrl) {
      return;
    }
    const viemchain = defineChain({
      id: chain.id,
      rpcUrls: {
        default: {
          http: [chain.rpcUrl],
        },
      },
      name: chain.nativeCurrency?.name ?? '',
      nativeCurrency: {
        name: chain.nativeCurrency?.name ?? '',
        symbol: chain.nativeCurrency?.symbol ?? '',
        decimals: chain.nativeCurrency?.decimal ?? 18,
      },
    });

    const client = createPublicClient({
      chain: viemchain,
      transport: http(chain.rpcUrl),
    });
    const bundlerClient = createBundlerClient({
      client,
      transport: http(chain.rpcUrl),
    });

    ChainClients.setState({
      [chain.id]: {
        client,
        bundlerClient,
      },
    });
  });
}

export function getClient(chainId: number): PublicClient {
  return ChainClients.getState()[chainId]?.client;
}

export function getBundlerClient(chainId: number): BundlerClient {
  return ChainClients.getState()[chainId]?.bundlerClient;
}
