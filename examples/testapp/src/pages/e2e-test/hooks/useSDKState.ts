/**
 * Hook for managing SDK loading and state
 *
 * Consolidates SDK source selection, loading, version management,
 * and SDK instance state into a single hook.
 */

import { useCallback, useRef, useState } from 'react';
import { SDK_CONFIG } from '../../../utils/e2e-test-config';
import { type LoadedSDK, type SDKSource, loadSDK } from '../../../utils/sdkLoader';
import type { CoinbaseWalletSDK } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface UseSDKStateReturn {
  // State
  sdkSource: SDKSource;
  loadedSDK: LoadedSDK | null;
  sdk: CoinbaseWalletSDK | null;
  // biome-ignore lint/suspicious/noExplicitAny: EIP1193Provider type varies
  provider: any | null; // EIP1193Provider type
  isLoadingSDK: boolean;
  sdkLoadError: string | null;

  // Actions
  setSdkSource: (source: SDKSource) => void;
  loadAndInitializeSDK: (config?: {
    appName?: string;
    appLogoUrl?: string;
    walletUrl?: string;
  }) => Promise<void>;
  setSdk: (sdk: CoinbaseWalletSDK | null) => void;
  // biome-ignore lint/suspicious/noExplicitAny: EIP1193Provider type varies
  setProvider: (provider: any | null) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useSDKState(): UseSDKStateReturn {
  const [sdkSource, setSdkSource] = useState<SDKSource>('local');
  const [loadedSDK, setLoadedSDK] = useState<LoadedSDK | null>(null);
  const [sdk, setSdk] = useState<CoinbaseWalletSDK | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: EIP1193Provider type varies
  const [provider, setProvider] = useState<any | null>(null);
  const [isLoadingSDK, setIsLoadingSDK] = useState(false);
  const [sdkLoadError, setSdkLoadError] = useState<string | null>(null);

  // Track SDK load version to handle race conditions when rapidly switching sources
  const loadVersionRef = useRef(0);

  const loadAndInitializeSDK = useCallback(
    async (config?: {
      appName?: string;
      appLogoUrl?: string;
      walletUrl?: string;
    }) => {
      // Increment load version to invalidate any in-flight SDK loads
      const currentLoadVersion = ++loadVersionRef.current;

      setIsLoadingSDK(true);
      setSdkLoadError(null);

      try {
        const loaded = await loadSDK({ source: sdkSource });

        // Check if this load is still valid (user hasn't switched sources)
        if (currentLoadVersion !== loadVersionRef.current) {
          // Ignoring stale SDK load - user has switched sources
          return;
        }

        setLoadedSDK(loaded);

        // Initialize SDK instance with provided or default config
        const sdkInstance = loaded.createCoinbaseWalletSDK({
          appName: config?.appName || SDK_CONFIG.APP_NAME,
          appLogoUrl: config?.appLogoUrl || SDK_CONFIG.APP_LOGO_URL,
          preference: {
            walletUrl: config?.walletUrl,
          },
        });

        setSdk(sdkInstance);
        const providerInstance = sdkInstance.getProvider();
        setProvider(providerInstance);
      } catch (error) {
        // Only update error state if this load is still current
        if (currentLoadVersion === loadVersionRef.current) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setSdkLoadError(errorMessage);
          throw error; // Re-throw so caller can handle
        }
      } finally {
        // Only update loading state if this load is still current
        if (currentLoadVersion === loadVersionRef.current) {
          setIsLoadingSDK(false);
        }
      }
    },
    [sdkSource]
  );

  return {
    // State
    sdkSource,
    loadedSDK,
    sdk,
    provider,
    isLoadingSDK,
    sdkLoadError,

    // Actions
    setSdkSource,
    loadAndInitializeSDK,
    setSdk,
    setProvider,
  };
}
