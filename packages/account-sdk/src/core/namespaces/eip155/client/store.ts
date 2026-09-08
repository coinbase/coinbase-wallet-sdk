import { PublicClient } from 'viem';
import { BundlerClient } from 'viem/account-abstraction';
import { createStore } from 'zustand/vanilla';

export type ChainClientState = {
  [key: number]: {
    client: PublicClient;
    bundlerClient: BundlerClient;
  };
};

export const ChainClients = createStore<ChainClientState>(() => ({}));
