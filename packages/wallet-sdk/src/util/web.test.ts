import { LIB_NAME, LIB_VERSION } from 'src/libInfo';

import { checkCrossOriginOpenerPolicy } from './checkCrossOriginOpenerPolicy';
import { closePopup, openPopup } from './web';
import { standardErrors } from ':core/error';

jest.mock('./checkCrossOriginOpenerPolicy');
(checkCrossOriginOpenerPolicy as jest.Mock).mockResolvedValue('null');

const mockOrigin = 'http://localhost';

describe('PopupManager', () => {
  beforeAll(() => {
    global.window = Object.create(window);
    Object.defineProperties(window, {
      innerWidth: { value: 1024 },
      innerHeight: { value: 768 },
      screenX: { value: 0 },
      screenY: { value: 0 },
      open: { value: jest.fn() },
      close: { value: jest.fn() },
      location: { value: { origin: mockOrigin } },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should open a popup with correct settings and focus it', async () => {
    const url = new URL('https://example.com');
    (window.open as jest.Mock).mockReturnValue({ focus: jest.fn() });

    const popup = await openPopup(url);

    expect(window.open).toHaveBeenNthCalledWith(
      1,
      url,
      'Smart Wallet',
      'width=420, height=540, left=302, top=114'
    );
    expect(popup.focus).toHaveBeenCalledTimes(1);

    expect(url.searchParams.get('sdkName')).toBe(LIB_NAME);
    expect(url.searchParams.get('sdkVersion')).toBe(LIB_VERSION);
    expect(url.searchParams.get('origin')).toBe(mockOrigin);
    expect(url.searchParams.get('coop')).toBe('null');
  });

  it('should throw an error if popup fails to open', async () => {
    (window.open as jest.Mock).mockReturnValue(null);

    await expect(openPopup(new URL('https://example.com'))).rejects.toThrow(
      standardErrors.rpc.internal('Pop up window failed to open')
    );
  });

  it('should close an open popup window', () => {
    const mockPopup = { close: jest.fn(), closed: false } as any as Window;

    closePopup(mockPopup);

    expect(mockPopup.close).toHaveBeenCalledTimes(1);
  });
});
