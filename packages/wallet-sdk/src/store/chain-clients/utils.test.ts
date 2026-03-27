import { optimismSepolia, sepolia } from 'viem/chains';

import { ChainClients } from './store.js';
import { createClients } from './utils.js';

describe('chain-clients/utils', () => {
  it('should create clients', () => {
    createClients([
      {
        id: sepolia.id,
        rpcUrl: sepolia.rpcUrls.default.http[0],
        nativeCurrency: {
          name: sepolia.nativeCurrency.name,
          symbol: sepolia.nativeCurrency.symbol,
          decimal: sepolia.nativeCurrency.decimals,
        },
      },
    ]);
    expect(Object.keys(ChainClients.getState()).length).toBe(1);
  });

  it('should create clients for multiple chains', () => {
    createClients([
      {
        id: sepolia.id,
        rpcUrl: sepolia.rpcUrls.default.http[0],
        nativeCurrency: {
          name: sepolia.nativeCurrency.name,
          symbol: sepolia.nativeCurrency.symbol,
          decimal: sepolia.nativeCurrency.decimals,
        },
      },
      {
        id: optimismSepolia.id,
        rpcUrl: optimismSepolia.rpcUrls.default.http[0],
        nativeCurrency: {
          name: optimismSepolia.nativeCurrency.name,
          symbol: optimismSepolia.nativeCurrency.symbol,
          decimal: optimismSepolia.nativeCurrency.decimals,
        },
      },
    ]);
    expect(Object.keys(ChainClients.getState()).length).toBe(2);
    expect(ChainClients.getState()[sepolia.id].client).toBeDefined();
    expect(ChainClients.getState()[optimismSepolia.id].client).toBeDefined();

    expect(ChainClients.getState()[sepolia.id].bundlerClient).toBeDefined();
    expect(ChainClients.getState()[optimismSepolia.id].bundlerClient).toBeDefined();
  });
});
