import { optimismSepolia, sepolia } from 'viem/chains';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createExtendedClient } from './extensions.js';
import { ChainClients } from './store.js';
import { createClients, getBundlerClient, getClient, type SDKChain } from './utils.js';

// Mock the ChainClients store
const mockState: any = {};
vi.mock('./store.js', () => ({
  ChainClients: {
    setState: vi.fn((state) => {
      Object.assign(mockState, typeof state === 'function' ? state(mockState) : state);
    }),
    getState: vi.fn(() => mockState),
  },
}));

// Mock the extensions
vi.mock('./extensions.js', () => ({
  createExtendedClient: vi.fn((client) => ({
    ...client,
    getSubAccount: vi.fn().mockResolvedValue({ subAccounts: [] }),
  })),
}));

describe('chain-clients/utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockState).forEach(key => delete mockState[key]);
  });

  it('should create clients', () => {
    createClients([
      {
        id: sepolia.id,
        rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      },
      {
        id: optimismSepolia.id,
        rpcUrl: 'https://sepolia.optimism.io',
      },
    ]);

    expect(ChainClients.setState).toHaveBeenCalled();
    expect(mockState[sepolia.id].client).toBeDefined();
    expect(mockState[sepolia.id].bundlerClient).toBeDefined();
    expect(mockState[optimismSepolia.id].client).toBeDefined();
    expect(mockState[optimismSepolia.id].bundlerClient).toBeDefined();
  });

  describe('createClients', () => {
    it('should create clients for chains with rpcUrl', () => {
      const chains: SDKChain[] = [
        {
          id: 1,
          rpcUrl: 'https://ethereum.example.com',
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimal: 18,
          },
        },
        {
          id: 2,
          // No rpcUrl - should be skipped
        },
      ];

      createClients(chains);

      expect(ChainClients.setState).toHaveBeenCalled();
      expect(mockState[1]).toBeDefined();
      expect(mockState[1].client).toBeDefined();
      expect(mockState[1].bundlerClient).toBeDefined();
      expect(mockState[2]).toBeUndefined();
    });
    it('should use default name and symbol when nativeCurrency is missing', () => {
      const chains: SDKChain[] = [
        {
          id: 1,
          rpcUrl: 'https://ethereum.example.com',
          // No nativeCurrency
        },
      ];

      createClients(chains);

      // Should not throw and should create the client
      expect(ChainClients.setState).toHaveBeenCalled();
      expect(mockState[1]).toBeDefined();
    });
  });

  describe('getClient', () => {
    it('should return client for existing chain', () => {
      const mockClient = { getChainId: vi.fn() };
      vi.mocked(ChainClients.getState).mockReturnValue({
        1: {
          client: mockClient as any,
          bundlerClient: {} as any,
        },
      });

      const result = getClient(1);
      expect(result).toBe(mockClient);
    });

    it('should return undefined for non-existing chain', () => {
      vi.mocked(ChainClients.getState).mockReturnValue({});

      const result = getClient(1);
      expect(result).toBeUndefined();
    });
  });

  describe('getBundlerClient', () => {
    it('should return bundler client for existing chain', () => {
      const mockBundlerClient = { getChainId: vi.fn() };
      vi.mocked(ChainClients.getState).mockReturnValue({
        1: {
          client: {} as any,
          bundlerClient: mockBundlerClient as any,
        },
      });

      const result = getBundlerClient(1);
      expect(result).toBe(mockBundlerClient);
    });

    it('should return undefined for non-existing chain', () => {
      vi.mocked(ChainClients.getState).mockReturnValue({});

      const result = getBundlerClient(1);
      expect(result).toBeUndefined();
    });
  });

  describe('extended client integration', () => {
    it('should create extended clients with getSubAccount method', () => {
      const chains: SDKChain[] = [
        {
          id: 1,
          rpcUrl: 'https://ethereum.example.com',
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimal: 18,
          },
        },
      ];

      createClients(chains);

      expect(vi.mocked(createExtendedClient)).toHaveBeenCalled();
    });
  });
});
