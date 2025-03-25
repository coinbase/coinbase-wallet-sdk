import { createCoinbaseWalletSDK as createCoinbaseWalletSDKHEAD } from '@coinbase/wallet-sdk';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as EventListeners from '../hooks/useEventListeners';
import * as DisconnectedError from '../hooks/useSpyOnDisconnectedError';
import * as CleanupUtils from '../utils/cleanupSDKLocalStorage';
import * as ConfigParamsContext from './ConfigParamsContextProvider';
import {
  EIP1193ProviderContextProvider,
  useEIP1193Provider,
} from './EIP1193ProviderContextProvider';

vi.mock('@coinbase/wallet-sdk', () => ({
  createCoinbaseWalletSDK: vi.fn(() => ({
    getProvider: vi.fn(() => mockProvider),
  })),
}));

vi.mock('@coinbase/wallet-sdk-latest', () => ({
  createCoinbaseWalletSDK: vi.fn(() => ({
    getProvider: vi.fn(() => mockProvider),
  })),
}));

const mockProvider = {
  on: vi.fn(),
  removeListener: vi.fn(),
  request: vi.fn(),
};

const mockAddEventListeners = vi.fn();
const mockRemoveEventListeners = vi.fn();
const mockSpyOnDisconnectedError = vi.fn();

function TestConsumer() {
  const context = useEIP1193Provider();
  return (
    <div>
      <div data-testid="sdk-exists">{context.sdk ? 'SDK exists' : 'No SDK'}</div>
      <div data-testid="provider-exists">
        {context.provider ? 'Provider exists' : 'No Provider'}
      </div>
    </div>
  );
}

describe('EIP1193ProviderContextProvider', () => {
  beforeEach(() => {
    vi.spyOn(ConfigParamsContext, 'useConfigParams').mockReturnValue({
      option: 'all',
      version: 'HEAD',
      scwUrl: 'https://test.url',
      config: { attribution: 'test-attribution' },
    });

    vi.spyOn(EventListeners, 'useEventListeners').mockReturnValue({
      addEventListeners: mockAddEventListeners,
      removeEventListeners: mockRemoveEventListeners,
    });

    vi.spyOn(DisconnectedError, 'useSpyOnDisconnectedError').mockReturnValue({
      spyOnDisconnectedError: mockSpyOnDisconnectedError,
      isOpen: false,
      onClose: vi.fn(),
    });

    vi.spyOn(CleanupUtils, 'cleanupSDKLocalStorage').mockImplementation(vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it('initializes SDK with HEAD version when version is HEAD', () => {
    render(
      <EIP1193ProviderContextProvider>
        <TestConsumer />
      </EIP1193ProviderContextProvider>
    );

    expect(createCoinbaseWalletSDKHEAD).toHaveBeenCalledWith({
      appName: 'SDK Playground',
      appChainIds: [84532, 8452],
      preference: {
        options: 'all',
        attribution: 'test-attribution',
        keysUrl: 'https://test.url',
      },
    });
    expect(screen.getByTestId('sdk-exists')).toBeTruthy();
    expect(screen.getByTestId('provider-exists')).toBeTruthy();
    expect(mockAddEventListeners).toHaveBeenCalledWith(mockProvider);
    expect(mockSpyOnDisconnectedError).toHaveBeenCalledWith(mockProvider);
  });

  // it('initializes SDK with latest version when version is not HEAD', () => {
  //   vi.spyOn(ConfigParamsContext, 'useConfigParams').mockReturnValue({
  //     option: 'all',
  //     version: 'latest',
  //     scwUrl: 'https://test.url',
  //     config: { attribution: 'test-attribution' },
  //   });

  //   render(
  //     <EIP1193ProviderContextProvider>
  //       <TestConsumer />
  //     </EIP1193ProviderContextProvider>
  //   );

  //   expect(createCoinbaseWalletSDKLatest).toHaveBeenCalledWith({
  //     appName: 'SDK Playground',
  //     appChainIds: [84532, 8452],
  //     preference: {
  //       options: 'all',
  //       attribution: 'test-attribution',
  //       keysUrl: 'https://test.url',
  //     },
  //   });
  // });

  // it('cleans up event listeners on unmount', () => {
  //   const { unmount } = render(
  //     <EIP1193ProviderContextProvider>
  //       <TestConsumer />
  //     </EIP1193ProviderContextProvider>
  //   );

  //   unmount();
  //   expect(mockRemoveEventListeners).toHaveBeenCalledWith(mockProvider);
  // });

  // it('throws error when useEIP1193Provider is used outside provider', () => {
  //   // Suppress console.error for this test
  //   const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  //   expect(() => render(<TestConsumer />)).toThrow(
  //     'useEIP1193Provider must be used within a EIP1193ProviderContextProvider'
  //   );

  //   consoleErrorSpy.mockRestore();
  // });
});
