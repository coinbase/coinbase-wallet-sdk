import { useToast } from '@chakra-ui/react';
import { act, renderHook } from '@testing-library/react';
import type { Mock } from 'vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useEventListeners } from './useEventListeners';

vi.mock('@chakra-ui/react', () => ({
  useToast: vi.fn(),
}));

describe('useEventListeners', () => {
  const mockToast = vi.fn();
  let mockProvider: any;

  beforeEach(() => {
    (useToast as Mock).mockReturnValue(mockToast);

    mockProvider = {
      on: vi.fn(),
      removeListener: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should add event listeners to provider', () => {
    const { result } = renderHook(() => useEventListeners());

    act(() => {
      result.current.addEventListeners(mockProvider);
    });

    expect(mockProvider.on).toHaveBeenCalledTimes(4);
    expect(mockProvider.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockProvider.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
    expect(mockProvider.on).toHaveBeenCalledWith('chainChanged', expect.any(Function));
    expect(mockProvider.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  test('should remove event listeners from provider', () => {
    const { result } = renderHook(() => useEventListeners());

    act(() => {
      result.current.removeEventListeners(mockProvider);
    });

    expect(mockProvider.removeListener).toHaveBeenCalledTimes(4);
    expect(mockProvider.removeListener).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockProvider.removeListener).toHaveBeenCalledWith(
      'accountsChanged',
      expect.any(Function)
    );
    expect(mockProvider.removeListener).toHaveBeenCalledWith('chainChanged', expect.any(Function));
    expect(mockProvider.removeListener).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  test('should show toast on connect event', () => {
    const { result } = renderHook(() => useEventListeners());
    let connectHandler: (info: { chainId: string }) => void;

    mockProvider.on.mockImplementation((event: string, handler: any) => {
      if (event === 'connect') {
        connectHandler = handler;
      }
    });

    act(() => {
      result.current.addEventListeners(mockProvider);
      connectHandler({ chainId: '0x1' });
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Connected',
        description: 'chainId: 0x1',
        status: 'success',
      })
    );
  });

  test('should show toast and reload page on disconnect event', () => {
    const { result } = renderHook(() => useEventListeners());
    let disconnectHandler: () => void;

    mockProvider.on.mockImplementation((event: string, handler: any) => {
      if (event === 'disconnect') {
        disconnectHandler = handler;
      }
    });

    act(() => {
      result.current.addEventListeners(mockProvider);
      disconnectHandler();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Disconnected',
        status: 'error',
      })
    );
  });

  test('should show toast on accountsChanged event', () => {
    const { result } = renderHook(() => useEventListeners());
    let accountsChangedHandler: (accounts: string[]) => void;

    mockProvider.on.mockImplementation((event: string, handler: any) => {
      if (event === 'accountsChanged') {
        accountsChangedHandler = handler;
      }
    });

    act(() => {
      result.current.addEventListeners(mockProvider);
      accountsChangedHandler(['0xabc123']);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Accounts changed',
        description: 'account: 0xabc123',
        status: 'info',
      })
    );
  });

  test('should show toast on chainChanged event', () => {
    const { result } = renderHook(() => useEventListeners());
    let chainChangedHandler: (chainId: string) => void;

    mockProvider.on.mockImplementation((event: string, handler: any) => {
      if (event === 'chainChanged') {
        chainChangedHandler = handler;
      }
    });

    act(() => {
      result.current.addEventListeners(mockProvider);
      chainChangedHandler('0x4');
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Chain changed',
        description: 'chainId: 0x4',
        status: 'info',
      })
    );
  });
});
