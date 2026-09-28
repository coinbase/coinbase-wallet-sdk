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
    eip155: {},
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

    it('passes the custom open function to the transport without storing it', () => {
      const openFn = vi.fn();

      createCoinbaseWalletSDK({ openFn });

      expect(mockCreateTransport).toHaveBeenCalledWith(expect.any(Object), store, openFn);
      expect(mockStore.config.set).toHaveBeenCalledWith(expect.not.objectContaining({ openFn }));
    });

    it('should create a provider with minimal parameters', () => {
      const result = createCoinbaseWalletSDK({}).getProvider();

      expect(mockCreateTransport).toHaveBeenCalledWith(
        {
          metadata: {
            appName: 'App',
            appLogoUrl: '',
          },
          preference: {},
        },
        store,
        undefined
      );
      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith({
        transport: { mockTransport: true },
        store,
      });

      expect(result).toEqual({ mockProvider: true });
    });

    it('should create a provider with custom app metadata', () => {
      const params: CreateProviderOptions = {
        appName: 'Test App',
        appLogoUrl: 'https://example.com/logo.png',
      };

      createCoinbaseWalletSDK(params).getProvider();

      expect(mockCreateTransport).toHaveBeenCalledWith(
        {
          metadata: {
            appName: 'Test App',
            appLogoUrl: 'https://example.com/logo.png',
          },
          preference: {},
        },
        store,
        undefined
      );
    });

    it('should create a provider with custom preference', () => {
      const params: CreateProviderOptions = {
        preference: {
          attribution: { auto: true },
        },
      };

      createCoinbaseWalletSDK(params).getProvider();

      expect(mockCreateTransport).toHaveBeenCalledWith(
        {
          metadata: {
            appName: 'App',
            appLogoUrl: '',
          },
          preference: {
            attribution: { auto: true },
          },
        },
        store,
        undefined
      );
    });
  });

  describe('Store configuration', () => {
    it('should set store configuration', () => {
      const params: CreateProviderOptions = {
        appName: 'Test App',
        preference: {},
      };

      createCoinbaseWalletSDK(params).getProvider();

      expect(mockStore.config.set).toHaveBeenCalledWith({
        metadata: {
          appName: 'Test App',
          appLogoUrl: '',
        },
        preference: {},
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
      mockRegisterSolanaWallet.mockImplementation(({ transport }: { transport: unknown }) => {
        solanaTransport = transport;
      });

      sdk.registerSolanaWallet();
      sdk.getProvider();

      expect(mockCreateTransport).toHaveBeenCalledOnce();
      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith({
        transport: solanaTransport,
        store,
      });
    });

    it('shares one popup transport when EVM initializes first', () => {
      const sdk = createCoinbaseWalletSDK({});
      let solanaTransport: unknown;
      mockRegisterSolanaWallet.mockImplementation(({ transport }: { transport: unknown }) => {
        solanaTransport = transport;
      });

      sdk.getProvider();
      sdk.registerSolanaWallet();

      expect(mockCreateTransport).toHaveBeenCalledOnce();
      expect(solanaTransport).toBe(mockCoinbaseWalletProvider.mock.calls[0][0].transport);
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
      expect(mockCoinbaseWalletProvider).toHaveBeenCalledWith({
        transport: { mockTransport: true },
        store,
      });
      expect(result).toEqual({ mockProvider: true });
    });
  });

  describe('Edge cases', () => {
    it('should handle null app logo URL', () => {
      createCoinbaseWalletSDK({ appLogoUrl: null }).getProvider();

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            appLogoUrl: '',
          }),
        }),
        store,
        undefined
      );
    });

    it('should build metadata without any app chain list', () => {
      createCoinbaseWalletSDK({}).getProvider();

      // Chain access is authorized for all of EVM, chain support comes from the wallet,
      // and the provider starts on mainnet until `wallet_switchEthereumChain` moves it,
      // so the app declares no chain at all.
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { appName: 'App', appLogoUrl: '' },
        }),
        store,
        undefined
      );
    });

    it('should never pass a chain field to the transport', () => {
      createCoinbaseWalletSDK({}).getProvider();

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.not.objectContaining({ defaultChainId: expect.anything() }),
        }),
        store,
        undefined
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
      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          preference: complexPreference,
        }),
        store,
        undefined
      );
    });
  });
});
