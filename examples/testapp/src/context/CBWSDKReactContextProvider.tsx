import { CoinbaseWalletSDK as CoinbaseWalletSDKHEAD, Preference } from '@coinbase/wallet-sdk';
import latestPkgJson from '@coinbase/wallet-sdk/package.json';
import { CoinbaseWalletSDK as CoinbaseWalletSDK372 } from '@coinbase/wallet-sdk-3.7.2';
import { CoinbaseWalletSDK as CoinbaseWalletSDK393 } from '@coinbase/wallet-sdk-3.9.3';
import { CoinbaseWalletSDK as CoinbaseWalletSDKLatest } from '@coinbase/wallet-sdk-latest';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

type CBWSDKProviderProps = {
  children: React.ReactNode;
};

const CBWSDKReactContext = React.createContext(null);

const SELECTED_SDK_KEY = 'selected_sdk_version';
export const sdkVersions = ['HEAD', latestPkgJson.version, '3.9.3', '3.7.2'] as const;
export type SDKVersionType = (typeof sdkVersions)[number];

const SELECTED_SCW_URL_KEY = 'scw_url';
export const scwUrls = [
  'https://keys.coinbase.com/connect',
  'https://keys-beta.coinbase.com/connect',
  'https://keys-dev.coinbase.com/connect',
  'http://localhost:3005/connect',
] as const;
export type ScwUrlType = (typeof scwUrls)[number];

const OPTIONS_KEY = 'option_key';
export const options = ['all', 'smartWalletOnly', 'eoaOnly'] as const;
export type OptionsType = (typeof options)[number];

declare global {
  interface Window {
    setPopupUrl: (url: string) => void;
  }
}

if (typeof window !== 'undefined') {
  window.setPopupUrl = (url: string) => {
    const communicator = window.ethereum?.communicator;
    if (communicator) {
      communicator.url = new URL(url);
    }
  };
}

export function CBWSDKReactContextProvider({ children }: CBWSDKProviderProps) {
  const previousScwUrlRef = useRef<ScwUrlType | undefined>();
  const [version, setVersion] = React.useState<SDKVersionType | undefined>(undefined);
  const [option, setOption] = React.useState<OptionsType | undefined>(undefined);
  const [config, setConfig] = React.useState<Preference>({
    options: option,
    attribution: {
      auto: false,
    },
  });
  const [sdk, setSdk] = React.useState(null);
  const [provider, setProvider] = React.useState(null);
  const [scwUrl, setScwUrl] = React.useState<ScwUrlType | undefined>(undefined);

  useEffect(() => {
    if (version === undefined) {
      const savedVersion = localStorage.getItem(SELECTED_SDK_KEY) as SDKVersionType;
      setVersion(
        sdkVersions.includes(savedVersion) ? (savedVersion as SDKVersionType) : sdkVersions[0]
      );
    }
  }, [version]);

  useEffect(() => {
    if (option === undefined) {
      const option = localStorage.getItem(OPTIONS_KEY) as OptionsType;
      setOption(options.includes(option) ? (option as OptionsType) : 'all');
    }
  }, [option]);

  useEffect(() => {
    if (scwUrl === undefined) {
      const savedScwUrl = localStorage.getItem(SELECTED_SCW_URL_KEY) as ScwUrlType;
      setScwUrl(scwUrls.includes(savedScwUrl) ? (savedScwUrl as ScwUrlType) : scwUrls[0]);
    }
  }, [scwUrl]);

  useEffect(() => {
    // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
    let cbwsdk;
    let preference: Preference | string;
    if (version === 'HEAD' || version === latestPkgJson.version) {
      const SDK = version === 'HEAD' ? CoinbaseWalletSDKHEAD : CoinbaseWalletSDKLatest;
      cbwsdk = new SDK({
        appName: 'SDK Playground',
        appChainIds: [84532, 8452],
      });
      if (version === 'HEAD') {
        preference = { options: option, attribution: config.attribution };
      } else {
        preference = { options: option };
      }
      setSdk(cbwsdk);
    } else if (version === '3.9.3' || version === '3.7.2') {
      const SDK = version === '3.9.3' ? CoinbaseWalletSDK393 : CoinbaseWalletSDK372;
      cbwsdk = new SDK({
        appName: 'Test App',
        enableMobileWalletLink: true,
      });
      preference = 'jsonRpcUrlMock';
      setSdk(cbwsdk);
    }
    if (!cbwsdk) {
      return;
    }
    const cbwprovider = cbwsdk.makeWeb3Provider(preference);

    const handleConnect = (info: { chainId: string }) => {
      // eslint-disable-next-line no-console
      console.log('🟢 Connected:', info);
    };

    const handleDisconnect = () => {
      // eslint-disable-next-line no-console
      console.log('🔴 Disconnect detected');
      location.reload();
    };

    const handleAccountsChanged = (accounts: string[]) => {
      // eslint-disable-next-line no-console
      console.log('👤 Accounts changed:', accounts);
    };

    const handleChainChanged = (chainId: string) => {
      // eslint-disable-next-line no-console
      console.log('⛓️ Chain changed:', chainId);
    };

    const handleMessage = (message: { type: string; data: unknown }) => {
      // eslint-disable-next-line no-console
      console.log('📨 Message received:', message);
    };

    cbwprovider.on('connect', handleConnect);
    cbwprovider.on('accountsChanged', handleAccountsChanged);
    cbwprovider.on('chainChanged', handleChainChanged);
    cbwprovider.on('message', handleMessage);
    cbwprovider.on('disconnect', handleDisconnect);

    // Add request handler to check for 4100 errors
    const originalRequest = cbwprovider.request.bind(cbwprovider);
    cbwprovider.request = async (...args) => {
      try {
        return await originalRequest(...args);
      } catch (error) {
        if (error?.code === 4100) {
          // eslint-disable-next-line no-console
          console.log('🔴 4100 error detected, disconnecting');
          handleDisconnect();
        }
        throw error;
      }
    };

    window.ethereum = cbwprovider;
    setProvider(cbwprovider);

    return () => {
      cbwprovider.off('connect', handleConnect);
      cbwprovider.off('disconnect', handleDisconnect);
      cbwprovider.off('accountsChanged', handleAccountsChanged);
      cbwprovider.off('chainChanged', handleChainChanged);
      cbwprovider.off('message', handleMessage);
    };
  }, [version, option, config]);

  useEffect(() => {
    if (version === 'HEAD' || version === latestPkgJson.version) {
      if (scwUrl && previousScwUrlRef.current && scwUrl !== previousScwUrlRef.current) {
        if (provider?.disconnect) {
          provider.disconnect();
        }
      }
      if (scwUrl) {
        previousScwUrlRef.current = scwUrl;
        window.setPopupUrl?.(scwUrl);
      }
    }
  }, [version, scwUrl, provider]);

  const setPreference = useCallback((option: OptionsType) => {
    localStorage.setItem(OPTIONS_KEY, option);
    setOption(option);
  }, []);

  const setSDKVersion = useCallback((version: SDKVersionType) => {
    localStorage.setItem(SELECTED_SDK_KEY, version);
    setVersion(version);
  }, []);

  const setScwUrlAndSave = useCallback((url: ScwUrlType) => {
    localStorage.setItem(SELECTED_SCW_URL_KEY, url);
    setScwUrl(url);
  }, []);

  const ctx = useMemo(
    () => ({
      sdk,
      provider,
      option,
      setPreference,
      sdkVersion: version,
      setSDKVersion,
      scwUrl,
      setScwUrlAndSave,
      config,
      setConfig,
    }),
    [
      sdk,
      provider,
      option,
      setPreference,
      version,
      setSDKVersion,
      scwUrl,
      setScwUrlAndSave,
      config,
      setConfig,
    ]
  );

  return <CBWSDKReactContext.Provider value={ctx}>{children}</CBWSDKReactContext.Provider>;
}

export function useCBWSDK() {
  const context = React.useContext(CBWSDKReactContext);
  if (context === undefined) {
    throw new Error('useCBWSDK must be used within a CBWSDKProvider');
  }
  return context;
}
