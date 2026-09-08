import * as telemetryModule from ':core/telemetry/initCCA.js';
import { store } from ':store/store.js';
import * as checkCrossOriginModule from ':util/checkCrossOriginOpenerPolicy.js';
import * as validatePreferencesModule from ':util/validatePreferences.js';
import type { Hex } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CreateProviderOptions,
  _resetGlobalInitialization,
  createBaseAccountSDK,
} from './createBaseAccountSDK.js';
import * as transportModule from './createTransport.js';
import { BaseAccountProvider } from './eip1193/BaseAccountProvider.js';
import * as getInjectedProviderModule from './eip1193/getInjectedProvider.js';

// Mock all dependencies
vi.mock(':store/store.js', () => ({
  store: {
    keys: {},
    session: {
      get: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
      subscribe: vi.fn(),
    },
    config: {
      set: vi.fn(),
    },
    eip155: {
      subAccountsConfig: {
        set: vi.fn(),
      },
      subAccounts: {
        get: vi.fn(),
      },
      paymasterUrls: {
        set: vi.fn(),
      },
    },
    persist: {
      rehydrate: vi.fn(),
    },
  },
}));

vi.mock(':core/telemetry/initCCA.js', () => ({
  loadTelemetryScript: vi.fn(),
}));

vi.mock('./createTransport.js', () => ({
  createTransport: vi.fn(),
}));

vi.mock(':util/checkCrossOriginOpenerPolicy.js', () => ({
  checkCrossOriginOpenerPolicy: vi.fn(),
}));

vi.mock(':util/validatePreferences.js', () => ({
  validatePreferences: vi.fn(),
  validateSubAccount: vi.fn(),
}));

vi.mock('./eip1193/BaseAccountProvider.js', () => ({
  BaseAccountProvider: vi.fn(),
}));

vi.mock('./eip1193/getInjectedProvider.js', () => ({
  getInjectedProvider: vi.fn(),
}));

const mockStore = store as any;
const mockLoadTelemetryScript = telemetryModule.loadTelemetryScript as any;
const mockCheckCrossOriginOpenerPolicy = checkCrossOriginModule.checkCrossOriginOpenerPolicy as any;
const mockValidatePreferences = validatePreferencesModule.validatePreferences as any;
const mockValidateSubAccount = validatePreferencesModule.validateSubAccount as any;
const mockBaseAccountProvider = BaseAccountProvider as any;
const mockGetInjectedProvider = getInjectedProviderModule.getInjectedProvider as any;
const mockCreateTransport = transportModule.createTransport as any;

describe('createProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the one-time initialization state so each test can verify initialization behavior
    _resetGlobalInitialization();
    mockBaseAccountProvider.mockReturnValue({
      mockProvider: true,
    });
    mockCreateTransport.mockReturnValue({ mockTransport: true });
    // Default: getInjectedProvider returns null to test BaseAccountProvider fallback
    mockGetInjectedProvider.mockReturnValue(null);
  });

  describe('Basic functionality', () => {
    it('constructs one inert transport without initializing either interface', () => {
      createBaseAccountSDK({});

      expect(mockCreateTransport).toHaveBeenCalledOnce();
      expect(mockBaseAccountProvider).not.toHaveBeenCalled();
    });

    it('should create a provider with minimal parameters', () => {
      const result = createBaseAccountSDK({}).getProvider();

      expect(mockBaseAccountProvider).toHaveBeenCalledWith(
        {
          metadata: {
            appName: 'App',
            appLogoUrl: '',
            appChainIds: [],
          },
          preference: {},
          paymasterUrls: undefined,
        },
        { mockTransport: true },
        store
      );

      expect(result).toEqual({ mockProvider: true });
    });

    it('should create a provider with custom app metadata', () => {
      const params: CreateProviderOptions = {
        appName: 'Test App',
        appLogoUrl: 'https://example.com/logo.png',
        appChainIds: [1, 137],
      };

      createBaseAccountSDK(params).getProvider();

      expect(mockBaseAccountProvider).toHaveBeenCalledWith(
        {
          metadata: {
            appName: 'Test App',
            appLogoUrl: 'https://example.com/logo.png',
            appChainIds: [1, 137],
          },
          preference: {},
          paymasterUrls: undefined,
        },
        { mockTransport: true },
        store
      );
    });

    it('should create a provider with custom preference', () => {
      const params: CreateProviderOptions = {
        preference: {
          attribution: { auto: true },
        },
      };

      createBaseAccountSDK(params).getProvider();

      expect(mockBaseAccountProvider).toHaveBeenCalledWith(
        {
          metadata: {
            appName: 'App',
            appLogoUrl: '',
            appChainIds: [],
          },
          preference: {
            attribution: { auto: true },
          },
          paymasterUrls: undefined,
        },
        { mockTransport: true },
        store
      );
    });

    it('should create a provider with paymaster URLs', () => {
      const params: CreateProviderOptions = {
        paymasterUrls: {
          1: 'https://paymaster.example.com',
          137: 'https://paymaster-polygon.example.com',
        },
      };

      createBaseAccountSDK(params).getProvider();

      expect(mockBaseAccountProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          paymasterUrls: {
            1: 'https://paymaster.example.com',
            137: 'https://paymaster-polygon.example.com',
          },
        }),
        { mockTransport: true },
        store
      );
    });
  });

  describe('Sub-account configuration', () => {
    it('should set sub-account configuration when provided', () => {
      const mockToOwnerAccount = vi.fn();
      const params: CreateProviderOptions = {
        subAccounts: {
          toOwnerAccount: mockToOwnerAccount,
          creation: 'on-connect',
          defaultAccount: 'sub',
          funding: 'spend-permissions',
        },
      };

      createBaseAccountSDK(params).getProvider();

      expect(mockValidateSubAccount).toHaveBeenCalledWith(mockToOwnerAccount);
      expect(mockStore.eip155.subAccountsConfig.set).toHaveBeenCalledWith({
        toOwnerAccount: mockToOwnerAccount,
        creation: 'on-connect',
        defaultAccount: 'sub',
        funding: 'spend-permissions',
      });
    });

    it('should handle partial sub-account configuration', () => {
      const params: CreateProviderOptions = {
        subAccounts: {
          creation: 'on-connect',
        },
      };

      createBaseAccountSDK(params).getProvider();

      expect(mockValidateSubAccount).not.toHaveBeenCalled();
      expect(mockStore.eip155.subAccountsConfig.set).toHaveBeenCalledWith({
        toOwnerAccount: undefined,
        creation: 'on-connect',
        defaultAccount: 'universal',
        funding: 'spend-permissions',
      });
    });

    it('should handle empty sub-account configuration', () => {
      const params: CreateProviderOptions = {
        subAccounts: undefined,
      };

      createBaseAccountSDK(params).getProvider();

      expect(mockStore.eip155.subAccountsConfig.set).toHaveBeenCalledWith({
        toOwnerAccount: undefined,
        creation: 'manual',
        defaultAccount: 'universal',
        funding: 'spend-permissions',
      });
    });

    it('should set funding mode when provided', () => {
      const mockToOwnerAccount = vi.fn();
      const params: CreateProviderOptions = {
        subAccounts: {
          toOwnerAccount: mockToOwnerAccount,
          creation: 'on-connect',
          defaultAccount: 'sub',
          funding: 'manual',
        },
      };

      createBaseAccountSDK(params).getProvider();

      expect(mockValidateSubAccount).toHaveBeenCalledWith(mockToOwnerAccount);
      expect(mockStore.eip155.subAccountsConfig.set).toHaveBeenCalledWith({
        toOwnerAccount: mockToOwnerAccount,
        creation: 'on-connect',
        defaultAccount: 'sub',
        funding: 'manual',
      });
    });

    it('should apply default values when config options not provided', () => {
      const mockToOwnerAccount = vi.fn();
      const params: CreateProviderOptions = {
        subAccounts: {
          toOwnerAccount: mockToOwnerAccount,
        },
      };

      createBaseAccountSDK(params).getProvider();

      expect(mockStore.eip155.subAccountsConfig.set).toHaveBeenCalledWith({
        toOwnerAccount: mockToOwnerAccount,
        creation: 'manual',
        defaultAccount: 'universal',
        funding: 'spend-permissions',
      });
    });

    it('should use default values when explicitly set to undefined', () => {
      const mockToOwnerAccount = vi.fn();
      const params: CreateProviderOptions = {
        subAccounts: {
          toOwnerAccount: mockToOwnerAccount,
          creation: undefined,
          defaultAccount: undefined,
          funding: undefined,
        },
      };

      createBaseAccountSDK(params).getProvider();

      expect(mockStore.eip155.subAccountsConfig.set).toHaveBeenCalledWith({
        toOwnerAccount: mockToOwnerAccount,
        creation: 'manual',
        defaultAccount: 'universal',
        funding: 'spend-permissions',
      });
    });
  });

  describe('Store configuration', () => {
    it('should set store configuration', () => {
      const params: CreateProviderOptions = {
        appName: 'Test App',
        preference: {},
        paymasterUrls: { 1: 'https://paymaster.example.com' },
      };

      createBaseAccountSDK(params).getProvider();

      expect(mockStore.config.set).toHaveBeenCalledWith({
        metadata: {
          appName: 'Test App',
          appLogoUrl: '',
          appChainIds: [],
        },
        preference: {},
      });
      expect(mockStore.eip155.paymasterUrls.set).toHaveBeenCalledWith({
        1: 'https://paymaster.example.com',
      });
    });

    it('should rehydrate store from storage', () => {
      createBaseAccountSDK({}).getProvider();

      expect(mockStore.persist.rehydrate).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should validate preferences', () => {
      const preference = { telemetry: true };
      createBaseAccountSDK({ preference }).getProvider();

      expect(mockValidatePreferences).toHaveBeenCalledWith(preference);
    });

    it('should validate sub-account when toOwnerAccount is provided', () => {
      const mockToOwnerAccount = vi.fn();
      createBaseAccountSDK({
        subAccounts: { toOwnerAccount: mockToOwnerAccount },
      }).getProvider();

      expect(mockValidateSubAccount).toHaveBeenCalledWith(mockToOwnerAccount);
    });

    it('should check cross-origin opener policy', () => {
      createBaseAccountSDK({}).getProvider();

      expect(mockCheckCrossOriginOpenerPolicy).toHaveBeenCalled();
    });
  });

  describe('Telemetry', () => {
    it('should load telemetry script when telemetry is not disabled', () => {
      createBaseAccountSDK({
        preference: { telemetry: true },
      }).getProvider();

      expect(mockLoadTelemetryScript).toHaveBeenCalled();
    });

    it('should load telemetry script when telemetry is undefined (default)', () => {
      createBaseAccountSDK({
        preference: {},
      }).getProvider();

      expect(mockLoadTelemetryScript).toHaveBeenCalled();
    });

    it('should not load telemetry script when telemetry is disabled', () => {
      createBaseAccountSDK({
        preference: { telemetry: false },
      }).getProvider();

      expect(mockLoadTelemetryScript).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle sub-account validation errors', () => {
      mockValidateSubAccount.mockImplementationOnce(() => {
        throw new Error('Invalid sub-account function');
      });

      expect(() => {
        createBaseAccountSDK({
          subAccounts: { toOwnerAccount: 'not-a-function' as any },
        }).getProvider();
      }).toThrow('Invalid sub-account function');
    });
  });

  describe('Provider fallback behavior', () => {
    it('should use injected provider when getInjectedProvider returns a provider', () => {
      const mockInjectedProvider = {
        request: vi.fn(),
        isCoinbaseBrowser: true,
        type: 'injected',
      };
      mockGetInjectedProvider.mockReturnValue(mockInjectedProvider);

      const result = createBaseAccountSDK({}).getProvider();

      expect(mockGetInjectedProvider).toHaveBeenCalled();
      expect(mockBaseAccountProvider).not.toHaveBeenCalled();
      expect(mockCreateTransport).toHaveBeenCalledOnce();
      expect(result).toBe(mockInjectedProvider);
    });

    it('should fallback to BaseAccountProvider when getInjectedProvider returns null', () => {
      mockGetInjectedProvider.mockReturnValue(null);

      const result = createBaseAccountSDK({}).getProvider();

      expect(mockGetInjectedProvider).toHaveBeenCalled();
      expect(mockBaseAccountProvider).toHaveBeenCalledWith(
        {
          metadata: {
            appName: 'App',
            appLogoUrl: '',
            appChainIds: [],
          },
          preference: {},
          paymasterUrls: undefined,
        },
        { mockTransport: true },
        store
      );
      expect(result).toEqual({ mockProvider: true });
    });
  });

  describe('Integration', () => {
    it('should perform all setup steps in correct order', () => {
      const mockToOwnerAccount = vi.fn();
      const params: CreateProviderOptions = {
        appName: 'Integration Test',
        appLogoUrl: 'https://example.com/logo.png',
        appChainIds: [1, 137],
        preference: {
          telemetry: true,
        },
        subAccounts: {
          toOwnerAccount: mockToOwnerAccount,
          creation: 'on-connect',
          defaultAccount: 'sub',
          funding: 'spend-permissions',
        },
        paymasterUrls: {
          1: 'https://paymaster.example.com',
        },
      };

      const result = createBaseAccountSDK(params).getProvider();

      // Check sub-account validation and configuration
      expect(mockValidateSubAccount).toHaveBeenCalledWith(mockToOwnerAccount);
      expect(mockStore.eip155.subAccountsConfig.set).toHaveBeenCalledWith({
        toOwnerAccount: mockToOwnerAccount,
        creation: 'on-connect',
        defaultAccount: 'sub',
        funding: 'spend-permissions',
      });

      // Check store configuration
      expect(mockStore.config.set).toHaveBeenCalledWith({
        metadata: {
          appName: 'Integration Test',
          appLogoUrl: 'https://example.com/logo.png',
          appChainIds: [1, 137],
        },
        preference: {
          telemetry: true,
        },
      });
      expect(mockStore.eip155.paymasterUrls.set).toHaveBeenCalledWith({
        1: 'https://paymaster.example.com',
      });

      // Check store rehydration
      expect(mockStore.persist.rehydrate).toHaveBeenCalled();

      // Check validation
      expect(mockCheckCrossOriginOpenerPolicy).toHaveBeenCalled();
      expect(mockValidatePreferences).toHaveBeenCalledWith({
        telemetry: true,
      });

      // Check telemetry
      expect(mockLoadTelemetryScript).toHaveBeenCalled();

      // Check provider creation
      expect(mockBaseAccountProvider).toHaveBeenCalledWith(
        {
          metadata: {
            appName: 'Integration Test',
            appLogoUrl: 'https://example.com/logo.png',
            appChainIds: [1, 137],
          },
          preference: {
            telemetry: true,
          },
          paymasterUrls: {
            1: 'https://paymaster.example.com',
          },
        },
        { mockTransport: true },
        store
      );

      expect(result).toEqual({ mockProvider: true });
    });
  });

  describe('Edge cases', () => {
    it('should handle null app logo URL', () => {
      createBaseAccountSDK({ appLogoUrl: null }).getProvider();

      expect(mockBaseAccountProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            appLogoUrl: '',
          }),
        }),
        { mockTransport: true },
        store
      );
    });

    it('should handle empty app chain IDs array', () => {
      createBaseAccountSDK({ appChainIds: [] }).getProvider();

      expect(mockBaseAccountProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            appChainIds: [],
          }),
        }),
        { mockTransport: true },
        store
      );
    });

    it('should handle complex nested preference objects', () => {
      const complexPreference = {
        attribution: { dataSuffix: '0x1234567890123456' as Hex },
        telemetry: false,
        customProperty: 'custom value',
      };

      createBaseAccountSDK({ preference: complexPreference }).getProvider();

      expect(mockValidatePreferences).toHaveBeenCalledWith(complexPreference);
      expect(mockBaseAccountProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          preference: complexPreference,
        }),
        { mockTransport: true },
        store
      );
    });
  });
});
