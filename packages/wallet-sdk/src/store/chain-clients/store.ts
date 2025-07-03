import { PublicClient } from 'viem';
import { BundlerClient } from 'viem/account-abstraction';
import { createStore } from 'zustand/vanilla';

import { ExtendedRpcMethods } from './extensions.js';

export type ChainClientState = {
  [key: number]: {
    client: PublicClient & ExtendedRpcMethods;
    bundlerClient: BundlerClient;
  };
};

export const ChainClients = createStore<ChainClientState>(() => ({}));
