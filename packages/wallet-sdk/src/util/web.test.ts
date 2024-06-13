import { standardErrors } from ':core/error';
import { closePopup, openPopup } from './web';

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
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should open a popup with correct settings and focus it', () => {
    const url = new URL('https://example.com');
    (window.open as jest.Mock).mockReturnValue({ focus: jest.fn() });

    const popup = openPopup(url);

    expect(window.open).toHaveBeenNthCalledWith(
      1,
      url,
      'Smart Wallet',
      'width=420, height=540, left=302, top=114'
    );
    expect(popup.focus).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if popup fails to open', () => {
    (window.open as jest.Mock).mockReturnValue(null);

    expect(() => openPopup(new URL('https://example.com'))).toThrow(
      standardErrors.rpc.internal('Pop up window failed to open')
    );
  });

  it('should close an open popup window', () => {
    const mockPopup = { close: jest.fn(), closed: false } as any as Window;

    closePopup(mockPopup);

    expect(mockPopup.close).toHaveBeenCalledTimes(1);
  });
});
