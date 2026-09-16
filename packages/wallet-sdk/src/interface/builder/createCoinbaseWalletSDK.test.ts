import * as telemetryModule from ':core/telemetry/initCCA.js';
import { store } from ':store/store.js';
import * as checkCrossOriginModule from ':util/checkCrossOriginOpenerPolicy.js';
import * as validatePreferencesModule from ':util/validatePreferences.js';
import type { Hex } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CreateProviderOptions,
  _resetGlobalInitialization,
  createCoinbaseWalletSDK,
} from './createCoinbaseWalletSDK.js';
import * as transportModule from './createTransport.js';
import { CoinbaseWalletProvider } from './eip1193/CoinbaseWalletProvider.js';
import * as getInjectedProviderModule from './eip1193/getInjectedProvider.js';
import * as solanaModule from './solana/registerSolanaWallet.js';

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

vi.mock('./eip1193/CoinbaseWalletProvider.js', () => ({
  CoinbaseWalletProvider: vi.fn(),
}));

vi.mock('./eip1193/getInjectedProvider.js', () => ({
  getInjectedProvider: vi.fn(),
}));

vi.mock('./solana/registerSolanaWallet.js', () => ({
  _resetSolanaWalletRegistration: vi.fn(),
  registerSolanaWallet: vi.fn(),
}));

const mockStore = store as any;
const mockLoadTelemetryScript = telemetryModule.loadTelemetryScript as any;
const mockCheckCrossOriginOpenerPolicy = checkCrossOriginModule.checkCrossOriginOpenerPolicy as any;
const mockValidatePreferences = validatePreferencesModule.validatePreferences as any;
const mockCoinbaseWalletProvider = CoinbaseWalletProvider as any;
const mockGetInjectedProvider = getInjectedProviderModule.getInjectedProvider as any;
const mockRegisterSolanaWallet = solanaModule.registerSolanaWallet as any;
const mockCreateTransport = transportModule.createTransport as any;

describe('createProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the one-time initialization state so each test can verify initialization behavior
    _resetGlobalInitialization();
    mockCoinbaseWalletProvider.mockReturnValue({
      mockProvider: true,
    });
    mockCreateTransport.mockReturnValue({ mockTransport: true });
    // Default: getInjectedProvider returns null to test CoinbaseWalletProvider fallback
    mockGetInjectedProvider.mockReturnValue(null);
  });

  describe('Basic functionality', () => {
    it('constructs one inert transport without initializing either interface', () => {
      createCoinbaseWalletSDK({});

      expect(mockCreateTransport).toHaveBeenCalledOnce();
      expect(mockCoinbaseWalletProvider).not.toHaveBeenCalled();
      expect(mockRegisterSolanaWallet).not.toHaveBeenCalled();
    });

    it('should create a provider with minimal parameters', () => {
      const result = createCoinbaseWalletSDK({}).getProvider();

      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith(
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

      createCoinbaseWalletSDK(params).getProvider();

      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith(
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

      createCoinbaseWalletSDK(params).getProvider();

      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith(
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

      createCoinbaseWalletSDK(params).getProvider();

      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith(
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

  describe('Store configuration', () => {
    it('should set store configuration', () => {
      const params: CreateProviderOptions = {
        appName: 'Test App',
        preference: {},
        paymasterUrls: { 1: 'https://paymaster.example.com' },
      };

      createCoinbaseWalletSDK(params).getProvider();

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
      createCoinbaseWalletSDK({}).getProvider();

      expect(mockStore.persist.rehydrate).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should validate preferences', () => {
      const preference = { telemetry: true };
      createCoinbaseWalletSDK({ preference }).getProvider();

      expect(mockValidatePreferences).toHaveBeenCalledWith(preference);
    });

    it('should check cross-origin opener policy', () => {
      createCoinbaseWalletSDK({}).getProvider();

      expect(mockCheckCrossOriginOpenerPolicy).toHaveBeenCalled();
    });
  });

  describe('Telemetry', () => {
    it('should load telemetry script when telemetry is not disabled', () => {
      createCoinbaseWalletSDK({
        preference: { telemetry: true },
      }).getProvider();

      expect(mockLoadTelemetryScript).toHaveBeenCalled();
    });

    it('should load telemetry script when telemetry is undefined (default)', () => {
      createCoinbaseWalletSDK({
        preference: {},
      }).getProvider();

      expect(mockLoadTelemetryScript).toHaveBeenCalled();
    });

    it('should not load telemetry script when telemetry is disabled', () => {
      createCoinbaseWalletSDK({
        preference: { telemetry: false },
      }).getProvider();

      expect(mockLoadTelemetryScript).not.toHaveBeenCalled();
    });
  });

  describe('Provider fallback behavior', () => {
    it('registers Solana only after explicit opt-in', () => {
      const sdk = createCoinbaseWalletSDK({});

      expect(mockRegisterSolanaWallet).not.toHaveBeenCalled();
      expect(sdk.registerSolanaWallet()).toBeUndefined();
      expect(mockRegisterSolanaWallet).toHaveBeenCalledOnce();
    });

    it('shares one popup transport when Solana initializes first', () => {
      const sdk = createCoinbaseWalletSDK({});
      let solanaTransport: unknown;
      mockRegisterSolanaWallet.mockImplementation((transport: unknown) => {
        solanaTransport = transport;
      });

      sdk.registerSolanaWallet();
      sdk.getProvider();

      expect(mockCreateTransport).toHaveBeenCalledOnce();
      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith(
        expect.any(Object),
        solanaTransport,
        store
      );
    });

    it('shares one popup transport when EVM initializes first', () => {
      const sdk = createCoinbaseWalletSDK({});
      let solanaTransport: unknown;
      mockRegisterSolanaWallet.mockImplementation((transport: unknown) => {
        solanaTransport = transport;
      });

      sdk.getProvider();
      sdk.registerSolanaWallet();

      expect(mockCreateTransport).toHaveBeenCalledOnce();
      expect(solanaTransport).toBe(mockCoinbaseWalletProvider.mock.calls[0][1]);
    });

    it('should use injected provider when getInjectedProvider returns a provider', () => {
      const mockInjectedProvider = {
        request: vi.fn(),
        isCoinbaseBrowser: true,
        type: 'injected',
      };
      mockGetInjectedProvider.mockReturnValue(mockInjectedProvider);

      const result = createCoinbaseWalletSDK({}).getProvider();

      expect(mockGetInjectedProvider).toHaveBeenCalled();
      expect(mockCoinbaseWalletProvider).not.toHaveBeenCalled();
      expect(mockCreateTransport).toHaveBeenCalledOnce();
      expect(result).toBe(mockInjectedProvider);
    });

    it('should fallback to CoinbaseWalletProvider when getInjectedProvider returns null', () => {
      mockGetInjectedProvider.mockReturnValue(null);

      const result = createCoinbaseWalletSDK({}).getProvider();

      expect(mockGetInjectedProvider).toHaveBeenCalled();
      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith(
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

  describe('Edge cases', () => {
    it('should handle null app logo URL', () => {
      createCoinbaseWalletSDK({ appLogoUrl: null }).getProvider();

      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith(
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
      createCoinbaseWalletSDK({ appChainIds: [] }).getProvider();

      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            appChainIds: [],
          }),
        }),
        { mockTransport: true },
        store
      );
    });

    it('should pass an explicit defaultChainId through to the provider', () => {
      createCoinbaseWalletSDK({ appChainIds: [1, 137], defaultChainId: 8453 }).getProvider();

      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            defaultChainId: 8453,
            appChainIds: [1, 137],
          }),
        }),
        { mockTransport: true },
        store
      );
    });

    it('should omit defaultChainId when the app does not set one', () => {
      createCoinbaseWalletSDK({ appChainIds: [1, 137] }).getProvider();

      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.not.objectContaining({ defaultChainId: expect.anything() }),
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

      createCoinbaseWalletSDK({ preference: complexPreference }).getProvider();

      expect(mockValidatePreferences).toHaveBeenCalledWith(complexPreference);
      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          preference: complexPreference,
        }),
        { mockTransport: true },
        store
      );
    });
  });
});
