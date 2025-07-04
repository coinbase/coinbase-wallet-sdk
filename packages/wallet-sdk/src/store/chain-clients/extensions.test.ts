import { describe, expect, it, vi } from 'vitest';

import {
    ExtendedRpcMethods,
    RpcMethodConfig,
    extendedRpcMethods,
} from './extensions.js';

describe('chain-clients/extensions', () => {
  describe('ExtendedRpcMethods type', () => {
    it('should have getSubAccount method signature', () => {
      // This is a compile-time check to ensure the type structure
      const methods: ExtendedRpcMethods = {
        getSubAccount: vi.fn().mockResolvedValue({
          subAccounts: [],
        }),
      };

      expect(methods.getSubAccount).toBeDefined();
      expect(typeof methods.getSubAccount).toBe('function');
    });
  });

  describe('extendedRpcMethods configuration', () => {
    it('should have at least getSubAccount method configured', () => {
      expect(extendedRpcMethods).toBeDefined();
      expect(Array.isArray(extendedRpcMethods)).toBe(true);
      expect(extendedRpcMethods.length).toBeGreaterThan(0);

      const getSubAccountConfig = extendedRpcMethods.find(
        (config) => config.methodName === 'getSubAccount'
      );
      expect(getSubAccountConfig).toBeDefined();
      expect(getSubAccountConfig?.rpcMethod).toBe('wallet_getSubAccount');
      expect(typeof getSubAccountConfig?.handler).toBe('function');
    });

    it('should have valid configuration structure for each method', () => {
      extendedRpcMethods.forEach((config) => {
        expect(config).toHaveProperty('methodName');
        expect(config).toHaveProperty('rpcMethod');
        expect(config).toHaveProperty('handler');
        expect(typeof config.methodName).toBe('string');
        expect(typeof config.rpcMethod).toBe('string');
        expect(typeof config.handler).toBe('function');
      });
    });
  });

  describe('RpcMethodConfig type safety', () => {
    it('should enforce correct configuration structure', () => {
      // Type-only test - no actual implementation
      const validConfig = {
        methodName: 'getSubAccount',
        rpcMethod: 'wallet_getSubAccount',
        handler: vi.fn(),
      } as RpcMethodConfig<'getSubAccount'>;

      expect(validConfig.methodName).toBe('getSubAccount');
      expect(validConfig.rpcMethod).toBe('wallet_getSubAccount');
      expect(typeof validConfig.handler).toBe('function');
    });
  });
}); 