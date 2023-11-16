import { CoinbaseWalletSDK as CoinbaseWalletSDKDev } from '@coinbase/wallet-sdk';
import { CoinbaseWalletSDK as CoinbaseWalletSDK37 } from '@coinbase/wallet-sdk-3.7';
import { CoinbaseWalletSDK as CoinbaseWalletSDK39 } from '@coinbase/wallet-sdk-3.9';
import React, { useEffect, useMemo } from 'react';

type CBWSDKProviderProps = {
  children: React.ReactNode;
};

const CBWSDKContext = React.createContext(null);

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
  const [version, setVersion] = React.useState<SDKVersionType>('master');
  const [sdk, setSdk] = React.useState(null);
  const [provider, setProvider] = React.useState(null);

  useEffect(() => {
    const selectedSDK = dynamicallyImportSDK(version);
    const cbwsdk = new selectedSDK({
      appName: 'Test App',
      enableMobileWalletLink: true, // beta feature
    });
    setSdk(cbwsdk);
    const cbwprovider = cbwsdk.makeWeb3Provider('http');
    setProvider(cbwprovider);
  }, [version]);

  const ctx = useMemo(
    () => ({
      sdk,
      provider,
      sdkVersion: version,
      setSDKVersion: setVersion,
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
