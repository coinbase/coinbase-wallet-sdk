import { CoinbaseWalletSDK as CoinbaseWalletSDK40 } from '@coinbase/wallet-sdk';
import { SignRequestHandler } from '@coinbase/wallet-sdk/dist/sign/SignRequestHandler';
import { CoinbaseWalletSDK as CoinbaseWalletSDK37 } from '@coinbase/wallet-sdk-3.7';
import { CoinbaseWalletSDK as CoinbaseWalletSDK39 } from '@coinbase/wallet-sdk-3.9';
import React, { useEffect, useMemo } from 'react';

type CBWSDKProviderProps = {
  children: React.ReactNode;
};

const CBWSDKReactContext = React.createContext(null);

const SELECTED_SDK_KEY = 'selected_sdk_version';
export const sdkVersions = ['4.0', '3.9', '3.7'] as const;
export type SDKVersionType = (typeof sdkVersions)[number];

const SELECTED_SCW_URL_KEY = 'scw_url';
export const scwUrls = [
  'https://keys.coinbase.com/connect',
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
    const handler = (window.ethereum as any).handlers?.find(
      (h: any) => h instanceof SignRequestHandler
    );
    if (handler && handler.popupCommunicator) {
      handler.popupCommunicator.url = new URL(url);
    }
  };
}

export function CBWSDKReactContextProvider({ children }: CBWSDKProviderProps) {
  const [version, setVersion] = React.useState<SDKVersionType | undefined>(undefined);
  const [option, setOption] = React.useState<OptionsType | undefined>(undefined);
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
    let cbwsdk;
    if (version === '4.0') {
      cbwsdk = new CoinbaseWalletSDK40({
        appName: 'SDK Playground',
        appChainIds: [84532, 8452],
        preference: {
          options: option,
        },
      });
      setSdk(cbwsdk);
    } else if (version === '3.9' || version === '3.7') {
      const SDK = version === '3.9' ? CoinbaseWalletSDK39 : CoinbaseWalletSDK37;
      cbwsdk = new SDK({
        appName: 'Test App',
        enableMobileWalletLink: true,
      });
      setSdk(cbwsdk);
    }
    if (!cbwsdk) return;
    const cbwprovider = cbwsdk.makeWeb3Provider();
    cbwprovider.on('disconnect', () => {
      location.reload();
    });
    window.ethereum = cbwprovider;
    setProvider(cbwprovider);
  }, [version, option]);

  useEffect(() => {
    if (version === '4.0' && scwUrl) {
      window.setPopupUrl?.(scwUrl);
    }
  }, [version, scwUrl, sdk]);

  const setPreference = (option: OptionsType) => {
    localStorage.setItem(OPTIONS_KEY, option);
    setOption(option);
  };

  const setSDKVersion = (version: SDKVersionType) => {
    localStorage.setItem(SELECTED_SDK_KEY, version);
    setVersion(version);
  };

  const setScwUrlAndSave = (url: ScwUrlType) => {
    localStorage.setItem(SELECTED_SCW_URL_KEY, url);
    setScwUrl(url);
  };

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
    }),
    [sdk, provider, option, setPreference, version, setSDKVersion, scwUrl, setScwUrlAndSave]
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
