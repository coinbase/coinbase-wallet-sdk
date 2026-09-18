import { waitFor } from '@testing-library/preact';
import { Mock, vi } from 'vitest';

import { PACKAGE_NAME, PACKAGE_VERSION } from ':core/constants.js';
import { getCrossOriginOpenerPolicy } from './checkCrossOriginOpenerPolicy.js';
import { closePopup, openPopup } from './web.js';

vi.mock('./checkCrossOriginOpenerPolicy');
(getCrossOriginOpenerPolicy as Mock).mockReturnValue('null');

// Mock Snackbar class
const mockPresentItem = vi.fn().mockReturnValue(() => {});
const mockClear = vi.fn();
const mockAttach = vi.fn();
const mockInstance = {
  presentItem: mockPresentItem,
  clear: mockClear,
  attach: mockAttach,
};

vi.mock(':ui/Dialog/index.js', () => ({
  initDialog: vi.fn().mockImplementation(() => mockInstance),
}));

const mockOrigin = 'http://localhost';

vi.mock(':store/store.js', () => ({
  store: {
    config: {
      get: vi.fn().mockReturnValue({ metadata: { appName: 'Test App' } }),
    },
  },
}));

describe('PopupManager', () => {
  beforeAll(() => {
    global.window = Object.create(window);
    Object.defineProperties(window, {
      innerWidth: { value: 1024 },
      innerHeight: { value: 768 },
      screenX: { value: 0 },
      screenY: { value: 0 },
      open: { value: vi.fn() },
      close: { value: vi.fn() },
      location: { value: { origin: mockOrigin } },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should open a popup with correct settings and focus it', async () => {
    const url = new URL('https://example.com');
    (window.open as Mock).mockReturnValue({ focus: vi.fn() });

    const popup = await openPopup(url);

    expect(window.open).toHaveBeenNthCalledWith(
      1,
      url,
      expect.stringContaining('wallet_'),
      'width=420, height=700, left=302, top=34'
    );
    expect(popup.focus).toHaveBeenCalledTimes(1);

    expect(url.searchParams.get('sdkName')).toBe(PACKAGE_NAME);
    expect(url.searchParams.get('sdkVersion')).toBe(PACKAGE_VERSION);
    expect(url.searchParams.get('origin')).toBe(mockOrigin);
    expect(url.searchParams.get('coop')).toBe('null');
  });

  it('should use a custom opener instead of window.open', async () => {
    const url = new URL('https://example.com');
    const mockPopup = { focus: vi.fn() } as unknown as Window;
    const openerFn = vi.fn().mockReturnValue(mockPopup);

    const popup = await openPopup(url, openerFn);

    expect(openerFn).toHaveBeenCalledWith(
      url,
      expect.stringContaining('wallet_'),
      'width=420, height=700, left=302, top=34'
    );
    expect(window.open).not.toHaveBeenCalled();
    expect(popup).toBe(mockPopup);
    expect(mockPopup.focus).toHaveBeenCalledOnce();
  });

  it('should retry with the custom opener when opening is blocked', async () => {
    const url = new URL('https://example.com');
    const mockPopup = { focus: vi.fn() } as unknown as Window;
    const openerFn = vi.fn().mockReturnValueOnce(null).mockReturnValueOnce(mockPopup);

    const promise = openPopup(url, openerFn);
    await waitFor(() => expect(mockPresentItem).toHaveBeenCalled());

    const retryButton = mockPresentItem.mock.calls[0][0].actionItems[0];
    retryButton.onClick();

    await expect(promise).resolves.toBe(mockPopup);
    expect(openerFn).toHaveBeenCalledTimes(2);
    expect(window.open).not.toHaveBeenCalled();
  });

  it('should not duplicate parameters when opening a popup with existing params', async () => {
    const url = new URL('https://example.com');
    url.searchParams.append('sdkName', PACKAGE_NAME);
    url.searchParams.append('sdkVersion', PACKAGE_VERSION);
    url.searchParams.append('origin', mockOrigin);
    url.searchParams.append('coop', 'null');

    (window.open as Mock).mockReturnValue({ focus: vi.fn() });

    await openPopup(url);

    const paramCount = url.searchParams.toString().split('&').length;
    expect(paramCount).toBe(4);
  });

  it('should show snackbar with retry button when popup is blocked and retry successfully', async () => {
    const url = new URL('https://example.com');
    const mockPopup = { focus: vi.fn() };
    (window.open as Mock).mockReturnValueOnce(null).mockReturnValueOnce(mockPopup);

    const promise = openPopup(url);

    await waitFor(() => {
      expect(mockPresentItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test App wants to continue in Coinbase Wallet',
          message: 'This action requires your permission to open a new window.',
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              text: 'Try again',
              variant: 'primary',
            }),
          ]),
        })
      );
    });

    const retryButton = mockPresentItem.mock.calls[0][0].actionItems[0];
    retryButton.onClick();

    const popup = await promise;
    expect(popup).toBe(mockPopup);
    expect(mockClear).toHaveBeenCalled();
    expect(window.open).toHaveBeenCalledTimes(2);
  });

  it('should show snackbar with retry button when popup is blocked and reject if retry fails', async () => {
    const url = new URL('https://example.com');
    (window.open as Mock).mockReturnValue(null);

    const promise = openPopup(url);

    await waitFor(() => {
      expect(mockPresentItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test App wants to continue in Coinbase Wallet',
          message: 'This action requires your permission to open a new window.',
          actionItems: expect.arrayContaining([
            expect.objectContaining({
              text: 'Try again',
              variant: 'primary',
            }),
          ]),
        })
      );
    });

    const retryButton = mockPresentItem.mock.calls[0][0].actionItems[0];
    retryButton.onClick();

    await expect(promise).rejects.toThrow('Popup window was blocked');
    expect(mockClear).toHaveBeenCalled();
  });

  it('should close an open popup window', () => {
    const mockPopup = { close: vi.fn(), closed: false } as any as Window;

    closePopup(mockPopup);

    expect(mockPopup.close).toHaveBeenCalledTimes(1);
  });
});
