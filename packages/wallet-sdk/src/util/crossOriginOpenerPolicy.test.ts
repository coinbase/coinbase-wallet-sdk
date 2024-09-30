import { checkCrossOriginOpenerPolicy } from './crossOriginOpenerPolicy';

describe('checkCrossOriginOpenerPolicy', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
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
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: jest.fn().mockReturnValue(null),
      },
    });

    checkCrossOriginOpenerPolicy();

    expect(global.fetch).toHaveBeenCalledWith(window.location.origin, {});
  });

  it('should log an error if Cross-Origin-Opener-Policy is same-origin', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: jest.fn().mockReturnValue('same-origin'),
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
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      headers: {
        get: jest.fn().mockReturnValue('unsafe-none'),
      },
    });

    await checkCrossOriginOpenerPolicy();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
