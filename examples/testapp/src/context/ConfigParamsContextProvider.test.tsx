import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OPTIONS_KEY,
  SELECTED_SCW_URL_KEY,
  SELECTED_SDK_KEY,
  options,
  scwUrls,
  sdkVersions,
} from '../store/config';
import { ConfigParamsContextProvider, useConfigParams } from './ConfigParamsContextProvider';

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <ConfigParamsContextProvider>{children}</ConfigParamsContextProvider>;
};

describe('ConfigParamsContextProvider', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });
  });

  afterEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('should initialize with default values when localStorage is empty', () => {
    const { result } = renderHook(() => useConfigParams(), {
      wrapper: TestWrapper,
    });

    expect(result.current.version).toBe(sdkVersions[0]);
    expect(result.current.option).toBe('all');
    expect(result.current.scwUrl).toBe(scwUrls[0]);
  });

  it('should initialize with values from localStorage', () => {
    localStorageMock.setItem(SELECTED_SDK_KEY, sdkVersions[1]);
    localStorageMock.setItem(OPTIONS_KEY, options[1]);
    localStorageMock.setItem(SELECTED_SCW_URL_KEY, scwUrls[1]);

    const { result } = renderHook(() => useConfigParams(), {
      wrapper: TestWrapper,
    });

    expect(result.current.version).toBe(sdkVersions[1]);
    expect(result.current.option).toBe(options[1]);
    expect(result.current.scwUrl).toBe(scwUrls[1]);
  });

  it('should update values when setPreference is called', () => {
    const { result } = renderHook(() => useConfigParams(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.setPreference(options[1]);
    });

    expect(result.current.option).toBe(options[1]);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(OPTIONS_KEY, options[1]);
  });

  it('should update values when setSDKVersion is called', () => {
    const { result } = renderHook(() => useConfigParams(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.setSDKVersion(sdkVersions[1]);
    });

    expect(result.current.version).toBe(sdkVersions[1]);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(SELECTED_SDK_KEY, sdkVersions[1]);
  });

  it('should update values when setScwUrlAndSave is called', () => {
    const { result } = renderHook(() => useConfigParams(), {
      wrapper: TestWrapper,
    });

    act(() => {
      result.current.setScwUrlAndSave(scwUrls[1]);
    });

    expect(result.current.scwUrl).toBe(scwUrls[1]);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(SELECTED_SCW_URL_KEY, scwUrls[1]);
  });

  it('should update config when setConfig is called', () => {
    const { result } = renderHook(() => useConfigParams(), {
      wrapper: TestWrapper,
    });
    const newConfig = {
      options: 'smartWalletOnly' as const,
      attribution: {
        auto: true,
      },
    };

    act(() => {
      result.current.setConfig(newConfig);
    });

    expect(result.current.config).toEqual(newConfig);
  });
});
