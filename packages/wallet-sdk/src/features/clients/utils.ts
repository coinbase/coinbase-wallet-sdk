import { createPublicClient, http, PublicClient } from 'viem';
import { BundlerClient, createBundlerClient } from 'viem/account-abstraction';

import { SUPPORTED_CHAIN_MAP } from './constants.js';
import { ChainClients } from './state.js';
import { Chain as SCWChain } from ':sign/scw/types.js';

export function createClients(chains: SCWChain[]) {
  chains.forEach((chain) => {
    const supportedChain = SUPPORTED_CHAIN_MAP[chain.id];
    if (!supportedChain) {
      return;
    }
    const client = createPublicClient({
      chain: supportedChain,
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
