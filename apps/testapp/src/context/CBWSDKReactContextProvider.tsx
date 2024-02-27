import CoinbaseWalletSDK from '@cbhq/wallet-sdk';
import { ConnectionPreference } from '@cbhq/wallet-sdk/dist/core/communicator/ConnectionPreference';
import React, { useEffect, useMemo } from 'react';

type CBWSDKProviderProps = {
  children: React.ReactNode;
};

const CBWSDKReactContext = React.createContext(null);
const SELECTED_URL_KEY = 'selected_scw_fe_url';
const PREFERRED_CONNECTION_KEY = 'preferred_connection';

export const SCWPopupURLs = [
  'https://keys.coinbase.com/connect',
  'https://scw-dev.cbhq.net/connect',
  'http://localhost:3005/connect',
] as const;
export type SCWPopupURLType = (typeof SCWPopupURLs)[number];

export function CBWSDKReactContextProvider({ children }: CBWSDKProviderProps) {
  const [scwURL, setScwURL] = React.useState<SCWPopupURLType | undefined>(undefined);
  const [connectionPreference, setConnectionPreference] = React.useState<
    ConnectionPreference | undefined
  >(undefined);
  const [sdk, setSdk] = React.useState(null);
  const [provider, setProvider] = React.useState(null);

  useEffect(() => {
    if (scwURL === undefined) {
      const savedURL = localStorage.getItem(SELECTED_URL_KEY) as SCWPopupURLType;
      setSCWPopupURL(
        SCWPopupURLs.includes(savedURL) ? (savedURL as SCWPopupURLType) : SCWPopupURLs[0]
      );
    }
    if (connectionPreference === undefined) {
      const savedPreference = localStorage.getItem(
        PREFERRED_CONNECTION_KEY
      ) as ConnectionPreference;
      setConnectionPreference(
        ['default', 'embedded'].includes(savedPreference)
          ? savedPreference
          : ('default' as ConnectionPreference)
      );
    }
  }, [scwURL, connectionPreference]);

  useEffect(() => {
    const cbwsdk = new CoinbaseWalletSDK({
      appName: 'SDK Playground',
      scwUrl: scwURL,
      connectionPreference: connectionPreference ?? 'default',
    });
    setSdk(cbwsdk);
    const cbwprovider = cbwsdk.makeWeb3Provider();
    setProvider(cbwprovider);
    cbwprovider.on('disconnect', () => {
      location.reload();
    });
  }, [scwURL, connectionPreference]);

  const setSCWPopupURL = (url: SCWPopupURLType) => {
    localStorage.setItem(SELECTED_URL_KEY, url);
    setScwURL(url);
  };

  const setPreference = (connectionPreference: ConnectionPreference) => {
    localStorage.setItem(PREFERRED_CONNECTION_KEY, connectionPreference);
    setConnectionPreference(connectionPreference);
  };

  const ctx = useMemo(
    () => ({
      sdk,
      provider,
      scwPopupURL: scwURL,
      setSCWPopupURL,
      connectionPreference,
      setPreference,
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
