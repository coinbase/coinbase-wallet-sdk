import { closePopup, openPopup } from './util';

describe('Communicator util', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('openPopup', () => {
    it('opens a popup window', () => {
      const url = new URL('https://keys.coinbase.com');
      const mockFocus = jest.fn();

      const windowSpy = jest.spyOn(window, 'open').mockImplementation(() => {
        return {
          focus: mockFocus,
        } as any;
      });

      openPopup(url);

      expect(windowSpy).toHaveBeenCalledTimes(1);
      expect(windowSpy).toHaveBeenCalledWith(url, 'Smart Wallet', expect.any(String));
      expect(mockFocus).toHaveBeenCalled();
    });

    it('uses the correct dimensions and location for the popup window', () => {
      const url = new URL('https://keys.coinbase.com');

      const mockScreenXY = 100;
      const mockScreenInnerWidthHeight = 50;
      Object.defineProperty(window, 'screenX', { value: mockScreenXY });
      Object.defineProperty(window, 'screenY', { value: mockScreenXY });
      Object.defineProperty(window, 'innerWidth', { value: mockScreenInnerWidthHeight });
      Object.defineProperty(window, 'innerHeight', { value: mockScreenInnerWidthHeight });

      const windowSpy = jest.spyOn(window, 'open').mockImplementation(() => {
        return {
          focus: jest.fn(),
        } as any;
      });

      openPopup(url);

      const expectedWidth = 420;
      const expectedHeight = 540;
      const expectedLeft = (mockScreenInnerWidthHeight - expectedWidth) / 2 + mockScreenXY;
      const expectedTop = (mockScreenInnerWidthHeight - expectedHeight) / 2 + mockScreenXY;
      expect(windowSpy).toHaveBeenCalledWith(
        url,
        'Smart Wallet',
        `width=${expectedWidth}, height=${expectedHeight}, left=${expectedLeft}, top=${expectedTop}`
      );
    });

    it('displays an alert and throws an error if the popup fails to open', () => {
      const url = new URL('https://keys.coinbase.com');
      jest.spyOn(window, 'open').mockReturnValue(null);
      jest.spyOn(window, 'alert').mockImplementation();

      expect(() => openPopup(url)).toThrowError('Pop up window failed to open');
      expect(window.alert).toHaveBeenCalledTimes(1);
      expect(window.alert).toHaveBeenCalledWith(
        'Smart wallet pop up failed, please disable your pop up blocker and try again.'
      );
    });
  });

  describe('closePopup', () => {
    it('closes the popup window', () => {
      const mockClose = jest.fn();
      const popup = {
        close: mockClose,
        closed: false,
      } as any;

      closePopup(popup);

      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('does nothing if the popup is already closed', () => {
      const mockClose = jest.fn();
      const popup = {
        close: mockClose,
        closed: true,
      } as any;

      closePopup(popup);

      expect(mockClose).not.toHaveBeenCalled();
    });
  });
});
