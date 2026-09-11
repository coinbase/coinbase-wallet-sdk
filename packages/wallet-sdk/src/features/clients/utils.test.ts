import { optimismSepolia, sepolia } from 'viem/chains';

import { ChainClients } from './state.js';
import { createClients } from './utils.js';

describe('createClients', () => {
  it('should create clients', () => {
    createClients([{ id: sepolia.id, rpcUrl: sepolia.rpcUrls.default.http[0] }]);
    expect(Object.keys(ChainClients.getState()).length).toBe(1);
  });

  it('should create clients for multiple chains', () => {
    createClients([
      { id: sepolia.id, rpcUrl: sepolia.rpcUrls.default.http[0] },
      { id: optimismSepolia.id, rpcUrl: optimismSepolia.rpcUrls.default.http[0] },
    ]);
    expect(Object.keys(ChainClients.getState()).length).toBe(2);
    expect(ChainClients.getState()[sepolia.id].client).toBeDefined();
    expect(ChainClients.getState()[optimismSepolia.id].client).toBeDefined();

    expect(ChainClients.getState()[sepolia.id].bundlerClient).toBeDefined();
    expect(ChainClients.getState()[optimismSepolia.id].bundlerClient).toBeDefined();
  });
});
