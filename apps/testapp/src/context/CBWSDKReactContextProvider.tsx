import { CoinbaseWalletSDK as CoinbaseWalletSDK40 } from '@coinbase/wallet-sdk';
import { SignRequestHandler } from '@coinbase/wallet-sdk/dist/sign/SignRequestHandler';
import { CoinbaseWalletSDK as CoinbaseWalletSDK37 } from '@coinbase/wallet-sdk-3.7';
import { CoinbaseWalletSDK as CoinbaseWalletSDK39 } from '@coinbase/wallet-sdk-3.9';
import React, { useEffect, useMemo } from 'react';

type CBWSDKProviderProps = {
  children: React.ReactNode;
};

const CBWSDKReactContext = React.createContext(null);
const SMART_WALLET_ONLY_KEY = 'smart_wallet_only';

const SELECTED_SDK_KEY = 'selected_sdk_version';
export const sdkVersions = ['4.0', '3.9', '3.7'] as const;
export type SDKVersionType = (typeof sdkVersions)[number];

const SELECTED_SCW_URL_KEY = 'scw_url';
export const scwUrls = [
  'https://keys.coinbase.com/connect',
  'http://localhost:3005/connect',
] as const;
export type ScwUrlType = (typeof scwUrls)[number];

declare global {
  interface Window {
    setPopupUrl: (url: string) => void;
  }
}

if (typeof window !== 'undefined') {
  window.setPopupUrl = (url: string) => {
    const handler = (window.ethereum as any).handlers.find(
      (h: any) => h instanceof SignRequestHandler
    );
    handler.popupCommunicator.url = new URL(url);
  };
}

export function CBWSDKReactContextProvider({ children }: CBWSDKProviderProps) {
  const [version, setVersion] = React.useState<SDKVersionType | undefined>(undefined);
  const [smartWalletOnly, setSmartWalletOnly] = React.useState<boolean | undefined>(undefined);
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
    if (smartWalletOnly === undefined) {
      const smartWalletOnly = localStorage.getItem(SMART_WALLET_ONLY_KEY);
      setSmartWalletOnly(smartWalletOnly === 'true' ? true : false);
    }
  }, [smartWalletOnly]);

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
        chainIds: [84532, 8452],
        smartWalletOnly,
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
  }, [version, smartWalletOnly]);

  useEffect(() => {
    if (version === '4.0' && scwUrl) {
      window.setPopupUrl?.(scwUrl);
    }
  }, [version, scwUrl, sdk]);

  const setPreference = (smartWalletOnly: boolean) => {
    localStorage.setItem(SMART_WALLET_ONLY_KEY, smartWalletOnly.toString());
    setSmartWalletOnly(smartWalletOnly);
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
      smartWalletOnly,
      setPreference,
      sdkVersion: version,
      setSDKVersion,
      scwUrl,
      setScwUrlAndSave,
    }),
    [
      sdk,
      provider,
      smartWalletOnly,
      setPreference,
      version,
      setSDKVersion,
      scwUrl,
      setScwUrlAndSave,
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
