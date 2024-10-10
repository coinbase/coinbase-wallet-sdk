import { vi } from 'vitest';

import { checkCrossOriginOpenerPolicy } from './crossOriginOpenerPolicy.js';

describe('checkCrossOriginOpenerPolicy', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should not run if window is undefined', () => {
    const originalWindow = global.window;
    // @ts-expect-error delete window property
    delete global.window;

    expect(checkCrossOriginOpenerPolicy()).toBeUndefined();

    // Restore the original window object
    global.window = originalWindow;
  });

  it('should fetch the current origin', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      headers: {
        get: vi.fn().mockReturnValue(null),
      },
    });

    checkCrossOriginOpenerPolicy();

    expect(global.fetch).toHaveBeenCalledWith(window.location.origin, {});
  });

  it('should log an error if Cross-Origin-Opener-Policy is same-origin', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      headers: {
        get: vi.fn().mockReturnValue('same-origin'),
      },
    });

    await checkCrossOriginOpenerPolicy();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Coinbase Wallet SDK requires the Cross-Origin-Opener-Policy header to not be set to 'same-origin'."
      )
    );
    consoleErrorSpy.mockRestore();
  });

  it('should not log an error if Cross-Origin-Opener-Policy is not same-origin', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      headers: {
        get: vi.fn().mockReturnValue('unsafe-none'),
      },
    });

    await checkCrossOriginOpenerPolicy();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
