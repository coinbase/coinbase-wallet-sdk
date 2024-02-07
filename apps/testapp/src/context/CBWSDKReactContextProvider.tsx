import CoinbaseWalletSDK from '@cbhq/wallet-sdk';
import React, { useEffect, useMemo } from 'react';

type CBWSDKProviderProps = {
  children: React.ReactNode;
};

const CBWSDKReactContext = React.createContext(null);
const SELECTED_URL_KEY = 'selected_scw_fe_url';

export const SCWPopupURLs = [
  'https://scw-dev.cbhq.net/connect',
  'http://localhost:3005/connect',
] as const;
export type SCWPopupURLType = (typeof SCWPopupURLs)[number];

export function CBWSDKReactContextProvider({ children }: CBWSDKProviderProps) {
  const [scwURL, setScwURL] = React.useState<SCWPopupURLType | undefined>(undefined);
  const [sdk, setSdk] = React.useState(null);
  const [provider, setProvider] = React.useState(null);

  useEffect(() => {
    if (scwURL === undefined) {
      const savedURL = localStorage.getItem(SELECTED_URL_KEY) as SCWPopupURLType;
      setSCWPopupURL(
        SCWPopupURLs.includes(savedURL) ? (savedURL as SCWPopupURLType) : SCWPopupURLs[0]
      );
    }
  }, [scwURL]);

  useEffect(() => {
    const cbwsdk = new CoinbaseWalletSDK({
      appName: 'SDK Playground',
      scwUrl: scwURL,
    });
    setSdk(cbwsdk);
    const cbwprovider = cbwsdk.makeWeb3Provider();
    setProvider(cbwprovider);
  }, [scwURL]);

  const setSCWPopupURL = (url: SCWPopupURLType) => {
    localStorage.setItem(SELECTED_URL_KEY, url);
    setScwURL(url);
  };

  const ctx = useMemo(
    () => ({
      sdk,
      provider,
      scwPopupURL: scwURL,
      setSCWPopupURL,
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
