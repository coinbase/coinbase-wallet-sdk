import { logGetInjectedProviderError } from ':core/telemetry/events/provider.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getInjectedProvider } from './getInjectedProvider.js';

vi.mock(':core/telemetry/events/provider.js', () => ({
  logGetInjectedProviderError: vi.fn(),
}));

// Mock the global window object
const mockWindow = {
  ethereum: undefined as any,
  top: {
    ethereum: undefined as any,
  },
};

// Store the original window object
const originalWindow = global.window;

describe('getInjectedProvider', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Reset the mock window state
    mockWindow.ethereum = undefined;
    mockWindow.top = {
      ethereum: undefined as any,
    };

    // Set up the global window mock
    global.window = mockWindow as any;
  });

  afterEach(() => {
    // Restore original window
    global.window = originalWindow;
  });

  describe('when window.ethereum exists', () => {
    it('should return the provider when it has the TBA identifier', () => {
      const mockProvider = {
        isCoinbaseBrowser: true,
        request: vi.fn(),
      };
      mockWindow.ethereum = mockProvider;

      const result = getInjectedProvider();

      expect(result).toBe(mockProvider);
    });

    it('should return null when provider does not have the TBA identifier', () => {
      const mockProvider = {
        request: vi.fn(),
      };
      mockWindow.ethereum = mockProvider;

      const result = getInjectedProvider();

      expect(result).toBeNull();
    });

    it('should return null when TBA identifier is false', () => {
      const mockProvider = {
        isCoinbaseBrowser: false,
        request: vi.fn(),
      };
      mockWindow.ethereum = mockProvider;

      const result = getInjectedProvider();

      expect(result).toBeNull();
    });
  });

  describe('when window.ethereum does not exist', () => {
    it('should return window.top.ethereum when it has the TBA identifier', () => {
      const mockProvider = {
        isCoinbaseBrowser: true,
        request: vi.fn(),
      };
      mockWindow.ethereum = undefined;
      mockWindow.top.ethereum = mockProvider;

      const result = getInjectedProvider();

      expect(result).toBe(mockProvider);
    });

    it('should return null when window.top.ethereum does not have the TBA identifier', () => {
      const mockProvider = {
        request: vi.fn(),
      };
      mockWindow.ethereum = undefined;
      mockWindow.top.ethereum = mockProvider;

      const result = getInjectedProvider();

      expect(result).toBeNull();
    });

    it('should return null when window.top.ethereum does not exist', () => {
      mockWindow.ethereum = undefined;
      mockWindow.top.ethereum = undefined;

      const result = getInjectedProvider();

      expect(result).toBeNull();
    });
  });

  describe('when both window.ethereum and window.top.ethereum exist', () => {
    it('should prefer window.top.ethereum', () => {
      const windowProvider = {
        isCoinbaseBrowser: true,
        request: vi.fn(),
        source: 'window',
      };
      const topProvider = {
        isCoinbaseBrowser: true,
        request: vi.fn(),
        source: 'top',
      };

      mockWindow.ethereum = windowProvider;
      mockWindow.top.ethereum = topProvider;

      const result = getInjectedProvider();

      expect(result).not.toBe(windowProvider);
      expect(result).toBe(topProvider);
    });

    it('should return null when window.top.ethereum exists but lacks TBA identifier (does not fallback)', () => {
      const windowProvider = {
        request: vi.fn(),
        source: 'window',
      };

      mockWindow.ethereum = windowProvider;
      mockWindow.top.ethereum = windowProvider;

      const result = getInjectedProvider();

      expect(result).toBeNull();
    });

    it('should fallback to window.top.ethereum when window.ethereum is null', () => {
      const topProvider = {
        isCoinbaseBrowser: true,
        request: vi.fn(),
        source: 'top',
      };

      mockWindow.ethereum = null;
      mockWindow.top.ethereum = topProvider;

      const result = getInjectedProvider();

      expect(result).toBe(topProvider);
    });

    it('should return null when neither has TBA identifier', () => {
      const windowProvider = {
        request: vi.fn(),
        source: 'window',
      };
      const topProvider = {
        request: vi.fn(),
        source: 'top',
      };

      mockWindow.ethereum = windowProvider;
      mockWindow.top.ethereum = topProvider;

      const result = getInjectedProvider();

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle null window.ethereum', () => {
      mockWindow.ethereum = null;
      mockWindow.top.ethereum = undefined;

      const result = getInjectedProvider();

      expect(result).toBeNull();
    });

    it('should handle missing window.top', () => {
      mockWindow.ethereum = undefined;
      (mockWindow as any).top = undefined;

      const result = getInjectedProvider();

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return null and log error when accessing window.ethereum throws', () => {
      // Mock window.ethereum as a getter that throws
      Object.defineProperty(mockWindow, 'ethereum', {
        get: () => {
          throw new Error('Access denied');
        },
        configurable: true,
      });

      const result = getInjectedProvider();

      expect(result).toBeNull();
      expect(vi.mocked(logGetInjectedProviderError)).toHaveBeenCalledWith({
        errorMessage: 'Access denied',
      });
    });
  });
});
