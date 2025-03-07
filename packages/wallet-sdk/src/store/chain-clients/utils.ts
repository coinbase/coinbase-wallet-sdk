import { createPublicClient, defineChain, http, PublicClient } from 'viem';
import { BundlerClient, createBundlerClient } from 'viem/account-abstraction';

import { ChainClients } from './store.js';
import { RPCResponseNativeCurrency } from ':core/message/RPCResponse.js';

export type SDKChain = {
  id: number;
  rpcUrl?: string;
  nativeCurrency?: RPCResponseNativeCurrency;
};

export function createClients(chains: SDKChain[]) {
  chains.forEach((c) => {
    if (!c.rpcUrl) {
      return;
    }
    const viemchain = defineChain({
      id: c.id,
      rpcUrls: {
        default: {
          http: [c.rpcUrl],
        },
      },
      name: c.nativeCurrency?.name ?? '',
      nativeCurrency: {
        name: c.nativeCurrency?.name ?? '',
        symbol: c.nativeCurrency?.symbol ?? '',
        decimals: c.nativeCurrency?.decimal ?? 18,
      },
    });

    const client = createPublicClient({
      chain: viemchain,
      transport: http(c.rpcUrl),
    });
    const bundlerClient = createBundlerClient({
      client,
      transport: http(c.rpcUrl),
    });

    ChainClients.setState({
      [c.id]: {
        client,
        bundlerClient,
      },
    });
  });
}

export function getClient(chainId: number): PublicClient | undefined {
  return ChainClients.getState()[chainId]?.client;
}

export function getBundlerClient(chainId: number): BundlerClient | undefined {
  return ChainClients.getState()[chainId]?.bundlerClient;
}
