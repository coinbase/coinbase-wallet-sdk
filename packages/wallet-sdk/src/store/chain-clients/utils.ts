import { createPublicClient, defineChain, http } from 'viem';
import { BundlerClient, createBundlerClient } from 'viem/account-abstraction';

import { RPCResponseNativeCurrency } from ':core/message/RPCResponse.js';
import { createExtendedClient } from './extensions.js';
import { ChainClients } from './store.js';

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

    const baseClient = createPublicClient({
      chain: viemchain,
      transport: http(c.rpcUrl),
    });

    // Create extended client with all custom RPC methods
    const client = createExtendedClient(baseClient);

    const bundlerClient = createBundlerClient({
      client: baseClient,
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

export function getClient(chainId: number) {
  return ChainClients.getState()[chainId]?.client;
}

export function getBundlerClient(chainId: number): BundlerClient | undefined {
  return ChainClients.getState()[chainId]?.bundlerClient;
}