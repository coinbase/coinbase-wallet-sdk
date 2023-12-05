import { CoinbaseWalletSDK as CoinbaseWalletSDKDev } from '@coinbase/wallet-sdk';
import { CoinbaseWalletSDK as CoinbaseWalletSDK37 } from '@coinbase/wallet-sdk-3.7';
import { CoinbaseWalletSDK as CoinbaseWalletSDK39 } from '@coinbase/wallet-sdk-3.9';
import React, { useEffect, useMemo } from 'react';

type CBWSDKProviderProps = {
  children: React.ReactNode;
};

const CBWSDKContext = React.createContext(null);
const SELECTED_SDK_KEY = 'selected_sdk_version';

export const sdkVersions = ['master', '3.9', '3.7'] as const;
export type SDKVersionType = (typeof sdkVersions)[number];

const dynamicallyImportSDK = (version: SDKVersionType) => {
  switch (version) {
    case 'master': {
      return CoinbaseWalletSDKDev;
    }
    case '3.7': {
      return CoinbaseWalletSDK37;
    }
    case '3.9': {
      return CoinbaseWalletSDK39;
    }
  }
};

export function CBWSDKProvider({ children }: CBWSDKProviderProps) {
  const [version, setVersion] = React.useState<SDKVersionType | undefined>(undefined);
  const [sdk, setSdk] = React.useState(null);
  const [provider, setProvider] = React.useState(null);

  useEffect(() => {
    if (version === undefined) {
      const savedVersion = localStorage.getItem(SELECTED_SDK_KEY) as SDKVersionType;
      setVersion(sdkVersions.includes(savedVersion) ? (savedVersion as SDKVersionType) : 'master');
    }
  }, [version]);

  useEffect(() => {
    const selectedSDK = dynamicallyImportSDK(version);
    if (selectedSDK) {
      const cbwsdk = new selectedSDK({
        appName: 'Test App',
        enableMobileWalletLink: true, // beta feature
      });
      setSdk(cbwsdk);
      const cbwprovider = cbwsdk.makeWeb3Provider('http');
      setProvider(cbwprovider);
    }
  }, [version]);

  const setSDKVersion = (version: SDKVersionType) => {
    localStorage.setItem(SELECTED_SDK_KEY, version);
    setVersion(version);
  };

  const ctx = useMemo(
    () => ({
      sdk,
      provider,
      sdkVersion: version,
      setSDKVersion,
    }),
    [sdk, provider]
  );

  return <CBWSDKContext.Provider value={ctx}>{children}</CBWSDKContext.Provider>;
}

export function useCBWSDK() {
  const context = React.useContext(CBWSDKContext);
  if (context === undefined) {
    throw new Error('useCBWSDK must be used within a CBWSDKProvider');
  }
  return context;
}
