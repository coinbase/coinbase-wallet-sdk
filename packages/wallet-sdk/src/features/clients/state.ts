import { PublicClient } from 'viem';
import { BundlerClient } from 'viem/account-abstraction';
import { createStore } from 'zustand/vanilla';

import { SUPPORTED_CHAIN_MAP } from './constants.js';

export type ChainClientState = {
  [key in keyof typeof SUPPORTED_CHAIN_MAP]: {
    client: PublicClient;
    bundlerClient: BundlerClient;
  };
};

export const ChainClients = createStore<ChainClientState>(() => ({}));
