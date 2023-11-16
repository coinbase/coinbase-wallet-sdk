import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { h } from 'preact';

import { ConnectDialog } from './ConnectDialog';

const renderConnectDialog = ({ connectDisabled = false, isConnected = true }) => {
  return render(
    <ConnectDialog
      darkMode={false}
      version="1"
      sessionId="abcd"
      sessionSecret="efgh"
      linkAPIUrl="https://www.walletlink.org"
      isOpen
      isConnected={isConnected}
      isParentConnection={false}
      chainId={1}
      connectDisabled={connectDisabled}
      onCancel={null}
    />
  );
};

const windowOpenSpy = jest.spyOn(window, 'open');

describe('TryExtensionLinkDialog', () => {
  test('should show scan QR box when connectDisabled is false', async () => {
    renderConnectDialog({ connectDisabled: false });

    await waitFor(() => {
      expect(screen.queryByTestId('connect-content')).toBeTruthy();
    });
  });

  test('should not show scan QR box when connectDisabled is true', async () => {
    renderConnectDialog({ connectDisabled: true });

    await waitFor(() => {
      expect(screen.queryByTestId('connect-content')).toBeNull();
    });
  });

  test('should show connecting spinner when not connected', async () => {
    renderConnectDialog({ isConnected: false });

    await waitFor(() => {
      expect(screen.queryByTestId('connecting-spinner')).toBeTruthy();
    });
  });

  test('should navigate to extension store in new tab after pressing install', async () => {
    const mockedWindowOpen = jest.fn();
    windowOpenSpy.mockImplementation(mockedWindowOpen);

    renderConnectDialog({});

    await waitFor(async () => {
      const button = await screen.findByRole('button', { name: 'Install' });
      fireEvent.click(button);
      expect(mockedWindowOpen).toBeCalledWith(
        'https://api.wallet.coinbase.com/rpc/v2/desktop/chrome',
        '_blank'
      );
    });
  });

  test('should show refresh button after pressing install', async () => {
    windowOpenSpy.mockImplementation(() => null);

    renderConnectDialog({});

    await waitFor(async () => {
      const button = await screen.findByRole('button', { name: 'Install' });
      expect(button.textContent).toEqual('Install');

      fireEvent.click(button);
      expect(button.textContent).toEqual('Refresh');
    });
  });
});
