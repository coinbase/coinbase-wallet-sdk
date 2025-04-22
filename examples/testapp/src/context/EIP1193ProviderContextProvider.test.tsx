import { createCoinbaseWalletSDK as createCoinbaseWalletSDKHEAD } from '@coinbase/wallet-sdk';
import { createCoinbaseWalletSDK as createCoinbaseWalletSDKLatest } from '@coinbase/wallet-sdk-latest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as EventListeners from '../hooks/useEventListeners';
import * as DisconnectedError from '../hooks/useSpyOnDisconnectedError';
import * as CleanupUtils from '../utils/cleanupSDKLocalStorage';
import * as ConfigContext from './ConfigContextProvider';
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
    vi.spyOn(ConfigContext, 'useConfig').mockReturnValue({
      option: 'all',
      version: 'HEAD',
      scwUrl: 'https://keys-dev.coinbase.com/connect',
      config: { options: 'all', attribution: { dataSuffix: '0xtestattribution' } },
      setPreference: vi.fn(),
      setSDKVersion: vi.fn(),
      setScwUrlAndSave: vi.fn(),
      setConfig: vi.fn(),
      subAccountsConfig: {
        enableAutoSubAccounts: true,
      },
      setSubAccountsConfig: vi.fn(),
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
        attribution: { dataSuffix: '0xtestattribution' },
        keysUrl: 'https://keys-dev.coinbase.com/connect',
      },
      subAccounts: {
        enableAutoSubAccounts: true,
      },
    });
    expect(screen.getByTestId('sdk-exists')).toBeTruthy();
    expect(screen.getByTestId('provider-exists')).toBeTruthy();
    expect(mockAddEventListeners).toHaveBeenCalledWith(mockProvider);
    expect(mockSpyOnDisconnectedError).toHaveBeenCalledWith(mockProvider);
  });

  it('initializes SDK with latest version when version is not HEAD', () => {
    vi.spyOn(ConfigContext, 'useConfig').mockReturnValue({
      option: 'all',
      version: 'latest',
      scwUrl: 'https://keys-dev.coinbase.com/connect',
      config: { options: 'all', attribution: { dataSuffix: '0xtestattribution' } },
      subAccountsConfig: {
        enableAutoSubAccounts: true,
      },
      setPreference: vi.fn(),
      setSDKVersion: vi.fn(),
      setScwUrlAndSave: vi.fn(),
      setConfig: vi.fn(),
      setSubAccountsConfig: vi.fn(),
    });

    render(
      <EIP1193ProviderContextProvider>
        <TestConsumer />
      </EIP1193ProviderContextProvider>
    );

    expect(createCoinbaseWalletSDKLatest).toHaveBeenCalledWith({
      appName: 'SDK Playground',
      appChainIds: [84532, 8452],
      preference: {
        options: 'all',
        attribution: { dataSuffix: '0xtestattribution' },
        keysUrl: 'https://keys-dev.coinbase.com/connect',
      },
      subAccounts: {
        enableAutoSubAccounts: true,
      },
    });
  });

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(
      <EIP1193ProviderContextProvider>
        <TestConsumer />
      </EIP1193ProviderContextProvider>
    );

    unmount();
    expect(mockRemoveEventListeners).toHaveBeenCalledWith(mockProvider);
  });
});
