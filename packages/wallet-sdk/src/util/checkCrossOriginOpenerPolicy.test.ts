import { checkCrossOriginOpenerPolicy } from './checkCrossOriginOpenerPolicy';

describe('checkCrossOriginOpenerPolicy', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should return true if window is undefined', async () => {
    const originalWindow = global.window;
    // @ts-expect-error delete window property
    delete global.window;

    expect(await checkCrossOriginOpenerPolicy()).toBe('non-browser-env');

    // Restore the original window object
    global.window = originalWindow;
  });

  it('should fetch the current origin', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
    });

    checkCrossOriginOpenerPolicy();

    expect(global.fetch).toHaveBeenCalledWith(window.location.origin, {});
  });

  it('should return false and log an error if Cross-Origin-Opener-Policy is same-origin', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: jest.fn().mockReturnValue('same-origin'),
      },
    });

    const result = await checkCrossOriginOpenerPolicy();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "Coinbase Wallet SDK requires the Cross-Origin-Opener-Policy header to not be set to 'same-origin'."
      )
    );
    expect(result).toBe('same-origin');
    consoleErrorSpy.mockRestore();
  });

  it('should return true and not log an error if Cross-Origin-Opener-Policy is not same-origin', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: jest.fn().mockReturnValue('unsafe-none'),
      },
    });

    const result = await checkCrossOriginOpenerPolicy();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(result).toBe('unsafe-none');
    consoleErrorSpy.mockRestore();
  });
});
