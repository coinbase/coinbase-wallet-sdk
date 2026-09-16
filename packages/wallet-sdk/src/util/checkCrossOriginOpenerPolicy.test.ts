import { vi } from 'vitest';

import {
  checkCrossOriginOpenerPolicy,
  getCrossOriginOpenerPolicy,
} from './checkCrossOriginOpenerPolicy.js';

describe('checkCrossOriginOpenerPolicy', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  it('should return non-browser-env if window is undefined', async () => {
    const originalWindow = global.window;
    // @ts-expect-error delete window property
    delete global.window;

    await checkCrossOriginOpenerPolicy();

    expect(getCrossOriginOpenerPolicy()).toBe('non-browser-env');

    // Restore the original window object
    global.window = originalWindow;
  });

  it('should fetch the current origin', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      headers: {
        get: vi.fn().mockReturnValue(null),
      },
      ok: true,
    });

    checkCrossOriginOpenerPolicy();

    expect(global.fetch).toHaveBeenCalledWith(
      `${window.location.origin}${window.location.pathname}`,
      { method: 'HEAD' }
    );
  });

  it('should log an error if Cross-Origin-Opener-Policy is same-origin', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      headers: {
        get: vi.fn().mockReturnValue('same-origin'),
      },
      ok: true,
    });

    await checkCrossOriginOpenerPolicy();
    const result = getCrossOriginOpenerPolicy();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Coinbase Wallet SDK requires the Cross-Origin-Opener-Policy header to not be set to 'same-origin'."
      )
    );
    expect(result).toBe('same-origin');
    consoleErrorSpy.mockRestore();
  });

  it('should not log an error if Cross-Origin-Opener-Policy is not same-origin', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      headers: {
        get: vi.fn().mockReturnValue('unsafe-none'),
      },
      ok: true,
    });

    await checkCrossOriginOpenerPolicy();
    const result = getCrossOriginOpenerPolicy();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(result).toBe('unsafe-none');
    consoleErrorSpy.mockRestore();
  });
});
