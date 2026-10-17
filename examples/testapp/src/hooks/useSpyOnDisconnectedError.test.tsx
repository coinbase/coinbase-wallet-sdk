import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpyOnDisconnectedError } from './useSpyOnDisconnectedError';

describe('useSpyOnDisconnectedError', () => {
  let mockProvider: any;
  let originalRequest: any;

  beforeEach(() => {
    originalRequest = vi.fn();
    mockProvider = {
      request: originalRequest,
    };
  });

  it('should return spyOnDisconnectedError, isOpen, and onClose', () => {
    const { result } = renderHook(() => useSpyOnDisconnectedError());

    expect(result.current.spyOnDisconnectedError).toBeDefined();
    expect(typeof result.current.spyOnDisconnectedError).toBe('function');
    expect(result.current.isOpen).toBe(false);
    expect(typeof result.current.onClose).toBe('function');
  });

  it('should successfully proxy requests when no error occurs', async () => {
    originalRequest.mockResolvedValue('success result');

    const { result } = renderHook(() => useSpyOnDisconnectedError());

    act(() => {
      result.current.spyOnDisconnectedError(mockProvider);
    });

    const response = await mockProvider.request('test_method');

    expect(originalRequest).toHaveBeenCalledWith('test_method');
    expect(response).toBe('success result');
    expect(result.current.isOpen).toBe(false);
  });

  it('should re-throw errors that are not code 4100', async () => {
    const testError = {
      code: -32000,
      message: 'Internal JSON-RPC error.',
    };
    originalRequest.mockRejectedValue(testError);

    const { result } = renderHook(() => useSpyOnDisconnectedError());

    act(() => {
      result.current.spyOnDisconnectedError(mockProvider);
    });

    await expect(mockProvider.request('test_method')).rejects.toThrow('Internal JSON-RPC error.');
    expect(result.current.isOpen).toBe(false);
  });

  it('should trigger onOpen when error code 4100 is detected', async () => {
    const disconnectError = {
      code: 4100,
      message: 'User rejected the request.',
    };
    originalRequest.mockRejectedValue(disconnectError);

    const { result } = renderHook(() => useSpyOnDisconnectedError());

    act(() => {
      result.current.spyOnDisconnectedError(mockProvider);
      mockProvider.request('test_method').catch((error: any) => {
        expect(error).toBe(disconnectError);
      });
    });

    await waitFor(() => {
      expect(result.current.isOpen).toBe(true);
    });

    act(() => {
      result.current.onClose();
    });

    expect(result.current.isOpen).toBe(false);
  });
});
