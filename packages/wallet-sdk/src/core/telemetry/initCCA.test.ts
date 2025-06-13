import { store } from ':store/store.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTelemetryScript } from './initCCA.js';

vi.mock('./telemetry-content.js', () => ({
  TELEMETRY_SCRIPT_CONTENT: 'mock-telemetry-script-content',
}));

vi.mock(':store/store.js', () => ({
  store: {
    config: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
}));

const mockStore = store as any;

describe('initCCA', () => {
  let mockClientAnalytics: any;
  let originalDocument: Document;
  let originalWindow: Window & typeof globalThis;
  let mockCrypto: any;

  beforeEach(() => {
    mockClientAnalytics = {
      init: vi.fn(),
      identify: vi.fn(),
      PlatformName: {
        web: 'web',
      },
    };

    mockCrypto = {
      randomUUID: vi.fn().mockReturnValue('mock-uuid-123'),
    };

    originalDocument = global.document;
    originalWindow = global.window;

    const mockScript = {
      textContent: '',
      type: '',
    };

    const mockHead = {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    };

    global.document = {
      createElement: vi.fn().mockReturnValue(mockScript),
      head: mockHead,
    } as any;

    global.window = {
      crypto: mockCrypto,
      ClientAnalytics: undefined,
    } as any;

    mockStore.config.get.mockReturnValue({});
    mockStore.config.set.mockImplementation(() => {});

    vi.clearAllMocks();
  });

  afterEach(() => {
    global.document = originalDocument;
    global.window = originalWindow;
    delete (global.window as any).ClientAnalytics;
  });

  describe('loadTelemetryScript', () => {
    it('should create and execute telemetry script when ClientAnalytics does not exist', async () => {
      const mockScript = {
        textContent: '',
        type: '',
      };

      (global.document.createElement as any).mockReturnValue(mockScript);

      const mockAppendChild = vi.fn().mockImplementation(() => {
        (global.window as any).ClientAnalytics = mockClientAnalytics;
      });

      global.document.head.appendChild = mockAppendChild;

      const result = await loadTelemetryScript();

      expect(result).toBeUndefined();
      expect(global.document.createElement).toHaveBeenCalledWith('script');
      expect(mockScript.textContent).toBe('mock-telemetry-script-content');
      expect(mockScript.type).toBe('text/javascript');
      expect(mockAppendChild).toHaveBeenCalledWith(mockScript);
      expect(global.document.head.removeChild).toHaveBeenCalledWith(mockScript);
    });

    it('should initialize ClientAnalytics with correct parameters after loading script', async () => {
      const mockScript = {
        textContent: '',
        type: '',
      };

      (global.document.createElement as any).mockReturnValue(mockScript);

      const mockAppendChild = vi.fn().mockImplementation(() => {
        (global.window as any).ClientAnalytics = mockClientAnalytics;
      });

      global.document.head.appendChild = mockAppendChild;

      await loadTelemetryScript();

      expect(mockClientAnalytics.init).toHaveBeenCalledWith({
        isProd: true,
        amplitudeApiKey: 'c66737ad47ec354ced777935b0af822e',
        platform: 'web',
        projectName: 'base_account_sdk',
        showDebugLogging: false,
        version: '1.0.0',
        apiEndpoint: 'https://cca-lite.coinbase.com',
      });
    });

    it('should use deviceId from store.config.get() when available', async () => {
      const mockScript = {
        textContent: '',
        type: '',
      };

      (global.document.createElement as any).mockReturnValue(mockScript);
      mockStore.config.get.mockReturnValue({ deviceId: 'store-device-id-123' });

      const mockAppendChild = vi.fn().mockImplementation(() => {
        (global.window as any).ClientAnalytics = mockClientAnalytics;
      });

      global.document.head.appendChild = mockAppendChild;

      await loadTelemetryScript();

      expect(mockClientAnalytics.identify).toHaveBeenCalledWith({
        deviceId: 'store-device-id-123',
      });
      expect(mockStore.config.set).toHaveBeenCalledWith({
        deviceId: 'store-device-id-123',
      });
      expect(mockCrypto.randomUUID).not.toHaveBeenCalled();
    });

    it('should fall back to crypto.randomUUID when store deviceId is not available', async () => {
      const mockScript = {
        textContent: '',
        type: '',
      };

      (global.document.createElement as any).mockReturnValue(mockScript);
      mockStore.config.get.mockReturnValue({});

      const mockAppendChild = vi.fn().mockImplementation(() => {
        (global.window as any).ClientAnalytics = mockClientAnalytics;
      });

      global.document.head.appendChild = mockAppendChild;

      await loadTelemetryScript();

      expect(mockClientAnalytics.identify).toHaveBeenCalledWith({
        deviceId: 'mock-uuid-123',
      });
      expect(mockStore.config.set).toHaveBeenCalledWith({
        deviceId: 'mock-uuid-123',
      });
      expect(mockCrypto.randomUUID).toHaveBeenCalled();
    });

    it('should handle case when both store deviceId and crypto.randomUUID are not available', async () => {
      const mockScript = {
        textContent: '',
        type: '',
      };

      (global.document.createElement as any).mockReturnValue(mockScript);
      mockStore.config.get.mockReturnValue({});
      (global.window as any).crypto = undefined;

      const mockAppendChild = vi.fn().mockImplementation(() => {
        (global.window as any).ClientAnalytics = mockClientAnalytics;
      });

      global.document.head.appendChild = mockAppendChild;

      await loadTelemetryScript();

      expect(mockClientAnalytics.identify).toHaveBeenCalledWith({
        deviceId: '',
      });
      expect(mockStore.config.set).toHaveBeenCalledWith({
        deviceId: '',
      });
    });

    it('should handle case when store deviceId is null', async () => {
      const mockScript = {
        textContent: '',
        type: '',
      };

      (global.document.createElement as any).mockReturnValue(mockScript);
      mockStore.config.get.mockReturnValue({ deviceId: null });

      const mockAppendChild = vi.fn().mockImplementation(() => {
        (global.window as any).ClientAnalytics = mockClientAnalytics;
      });

      global.document.head.appendChild = mockAppendChild;

      await loadTelemetryScript();

      expect(mockClientAnalytics.identify).toHaveBeenCalledWith({
        deviceId: 'mock-uuid-123',
      });
      expect(mockStore.config.set).toHaveBeenCalledWith({
        deviceId: 'mock-uuid-123',
      });
      expect(mockCrypto.randomUUID).toHaveBeenCalled();
    });

    it('should reject promise when script execution fails', async () => {
      const mockScript = {
        textContent: '',
        type: '',
      };

      (global.document.createElement as any).mockReturnValue(mockScript);

      const mockAppendChild = vi.fn().mockImplementation(() => {
        throw new Error('Script execution failed');
      });

      global.document.head.appendChild = mockAppendChild;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(loadTelemetryScript()).rejects.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to execute inlined telemetry script');

      consoleSpy.mockRestore();
    });
  });
});
