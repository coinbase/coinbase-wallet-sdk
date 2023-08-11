import { CoinbaseWalletProvider, CoinbaseWalletSDK } from '@coinbase/wallet-sdk';
import React, { useEffect, useMemo } from 'react';
type CBWSDKProviderProps = {
  children: React.ReactNode;
};

const CBWSDKContext = React.createContext(null);

export function CBWSDKProvider({ children }: CBWSDKProviderProps) {
  const [sdk, setSdk] = React.useState<CoinbaseWalletSDK | null>(null);
  const [provider, setProvider] = React.useState<CoinbaseWalletProvider | null>(null);

  useEffect(() => {
    const cbwsdk = new CoinbaseWalletSDK({
      appName: 'Test App',
      enableMobileWalletLink: true, // beta feature
    });
    setSdk(cbwsdk);
    const cbwprovider = cbwsdk.makeWeb3Provider('http');
    setProvider(cbwprovider);
  }, []);

  const ctx = useMemo(
    () => ({
      sdk,
      provider,
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
