import * as telemetryModule from ':core/telemetry/initCCA.js';
import { store } from ':store/store.js';
import * as checkCrossOriginModule from ':util/checkCrossOriginOpenerPolicy.js';
import * as validatePreferencesModule from ':util/validatePreferences.js';
import type { Hex } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { connectWallet } from './connect/connect.js';
import {
  CreateProviderOptions,
  _resetGlobalInitialization,
  createCoinbaseWalletSDK,
} from './createCoinbaseWalletSDK.js';
import * as transportModule from './createTransport.js';
import { CoinbaseWalletProvider } from './eip1193/CoinbaseWalletProvider.js';
import * as getInjectedProviderModule from './eip1193/getInjectedProvider.js';
import * as solanaModule from './wallet-standard/registerSolanaWallet.js';

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
      get: vi.fn(),
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

vi.mock('./connect/connect.js', () => ({
  connectWallet: vi.fn(),
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

vi.mock('./wallet-standard/registerSolanaWallet.js', () => ({
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
    mockStore.config.get.mockReturnValue({});
    // Default: getInjectedProvider returns null to test CoinbaseWalletProvider fallback
    mockGetInjectedProvider.mockReturnValue(null);
  });

  describe('Basic functionality', () => {
    it('registers the Solana wallet on creation and defers the EVM provider', () => {
      createCoinbaseWalletSDK({});

      expect(mockCreateTransport).toHaveBeenCalledOnce();
      expect(mockRegisterSolanaWallet).toHaveBeenCalledOnce();
      expect(mockRegisterSolanaWallet).toHaveBeenCalledWith({
        transport: { mockTransport: true },
        session: store.session,
      });
      expect(mockCoinbaseWalletProvider).not.toHaveBeenCalled();
    });

    it('passes the custom open function to the transport without storing it', () => {
      const openFn = vi.fn();

      createCoinbaseWalletSDK({ openFn });

      expect(mockCreateTransport).toHaveBeenCalledWith(expect.any(Object), store, openFn);
      expect(mockStore.config.set).toHaveBeenCalledWith(expect.not.objectContaining({ openFn }));
    });

    it('should create a provider with minimal parameters', () => {
      const result = createCoinbaseWalletSDK({}).evm.getProvider();

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

      createCoinbaseWalletSDK(params).evm.getProvider();

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

      createCoinbaseWalletSDK(params).evm.getProvider();

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

      createCoinbaseWalletSDK(params).evm.getProvider();

      expect(mockStore.config.set).toHaveBeenCalledWith({
        metadata: {
          appName: 'Test App',
          appLogoUrl: '',
        },
        preference: {},
      });
    });

    it('should rehydrate store from storage', () => {
      createCoinbaseWalletSDK({}).evm.getProvider();

      expect(mockStore.persist.rehydrate).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should validate preferences', () => {
      const preference = { telemetry: true };
      createCoinbaseWalletSDK({ preference }).evm.getProvider();

      expect(mockValidatePreferences).toHaveBeenCalledWith(preference);
    });

    it('should check cross-origin opener policy', () => {
      createCoinbaseWalletSDK({}).evm.getProvider();

      expect(mockCheckCrossOriginOpenerPolicy).toHaveBeenCalled();
    });
  });

  describe('Telemetry', () => {
    it('should load telemetry script when telemetry is not disabled', () => {
      createCoinbaseWalletSDK({
        preference: { telemetry: true },
      }).evm.getProvider();

      expect(mockLoadTelemetryScript).toHaveBeenCalled();
    });

    it('should load telemetry script when telemetry is undefined (default)', () => {
      createCoinbaseWalletSDK({
        preference: {},
      }).evm.getProvider();

      expect(mockLoadTelemetryScript).toHaveBeenCalled();
    });

    it('should not load telemetry script when telemetry is disabled', () => {
      createCoinbaseWalletSDK({
        preference: { telemetry: false },
      }).evm.getProvider();

      expect(mockLoadTelemetryScript).not.toHaveBeenCalled();
    });

    it('measures sdk.connect() as a request on the sdk_connect surface', async () => {
      const logEvent = vi.fn();
      window.ClientAnalytics = { logEvent } as unknown as typeof window.ClientAnalytics;
      vi.mocked(connectWallet).mockResolvedValue({ evm: { accounts: [] } });

      await createCoinbaseWalletSDK({}).connect();

      expect(connectWallet).toHaveBeenCalledWith({
        options: undefined,
        transport: expect.objectContaining({ mockTransport: true }),
      });
      expect(logEvent).toHaveBeenCalledWith(
        'provider.request.responded',
        expect.objectContaining({ surface: 'sdk_connect', method: 'connect' }),
        'high'
      );
      window.ClientAnalytics = undefined;
    });
  });

  describe('Provider fallback behavior', () => {
    it('logs which provider getProvider() picked, once per SDK', () => {
      const logEvent = vi.fn();
      window.ClientAnalytics = { logEvent } as unknown as typeof window.ClientAnalytics;
      const selected = () =>
        logEvent.mock.calls
          .filter(([name]) => name === 'provider.selected')
          .map(([, data]) => data);

      const sdk = createCoinbaseWalletSDK({});
      sdk.evm.getProvider();
      sdk.evm.getProvider();
      expect(selected()).toEqual([expect.objectContaining({ providerKind: 'sdk' })]);

      mockGetInjectedProvider.mockReturnValue({ request: vi.fn(), isCoinbaseBrowser: true });
      createCoinbaseWalletSDK({}).evm.getProvider();
      expect(selected()[1]).toEqual(expect.objectContaining({ providerKind: 'injected' }));
      window.ClientAnalytics = undefined;
    });

    it('shares one popup transport between the Solana wallet and the EVM provider', () => {
      const sdk = createCoinbaseWalletSDK({});
      sdk.evm.getProvider();

      expect(mockCreateTransport).toHaveBeenCalledOnce();
      expect(mockCoinbaseWalletProvider.mock.calls[0][0].transport).toBe(
        mockRegisterSolanaWallet.mock.calls[0][0].transport
      );
    });

    it('should use injected provider when getInjectedProvider returns a provider', () => {
      const mockInjectedProvider = {
        request: vi.fn(),
        isCoinbaseBrowser: true,
        type: 'injected',
      };
      mockGetInjectedProvider.mockReturnValue(mockInjectedProvider);

      const result = createCoinbaseWalletSDK({}).evm.getProvider();

      expect(mockGetInjectedProvider).toHaveBeenCalled();
      expect(mockCoinbaseWalletProvider).not.toHaveBeenCalled();
      expect(mockCreateTransport).toHaveBeenCalledOnce();
      expect(result).toBe(mockInjectedProvider);
    });

    it('should fallback to CoinbaseWalletProvider when getInjectedProvider returns null', () => {
      mockGetInjectedProvider.mockReturnValue(null);

      const result = createCoinbaseWalletSDK({}).evm.getProvider();

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
      createCoinbaseWalletSDK({ appLogoUrl: null }).evm.getProvider();

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
      createCoinbaseWalletSDK({}).evm.getProvider();

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
      createCoinbaseWalletSDK({}).evm.getProvider();

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

      createCoinbaseWalletSDK({ preference: complexPreference }).evm.getProvider();

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
