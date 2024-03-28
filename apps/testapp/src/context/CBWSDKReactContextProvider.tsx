import { CoinbaseWalletSDK as CoinbaseWalletSDK40 } from '@coinbase/wallet-sdk';
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

export function CBWSDKReactContextProvider({ children }: CBWSDKProviderProps) {
  const [version, setVersion] = React.useState<SDKVersionType | undefined>(undefined);
  const [smartWalletOnly, setSmartWalletOnly] = React.useState<boolean | undefined>(undefined);
  const [sdk, setSdk] = React.useState(null);
  const [provider, setProvider] = React.useState(null);

  useEffect(() => {
    if (version === undefined) {
      const savedVersion = localStorage.getItem(SELECTED_SDK_KEY) as SDKVersionType;
      setVersion(sdkVersions.includes(savedVersion) ? (savedVersion as SDKVersionType) : '4.0');
    }
  }, [version]);

  useEffect(() => {
    if (smartWalletOnly === undefined) {
      const smartWalletOnly = localStorage.getItem(SMART_WALLET_ONLY_KEY);
      setSmartWalletOnly(smartWalletOnly === 'true' ? true : false);
    }
  }, [smartWalletOnly]);

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

  const setPreference = (smartWalletOnly: boolean) => {
    localStorage.setItem(SMART_WALLET_ONLY_KEY, smartWalletOnly.toString());
    setSmartWalletOnly(smartWalletOnly);
  };

  const setSDKVersion = (version: SDKVersionType) => {
    localStorage.setItem(SELECTED_SDK_KEY, version);
    setVersion(version);
  };

  const ctx = useMemo(
    () => ({
      sdk,
      provider,
      smartWalletOnly,
      setPreference,
      sdkVersion: version,
      setSDKVersion,
    }),
    [sdk, provider]
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
