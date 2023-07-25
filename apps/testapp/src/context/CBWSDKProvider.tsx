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
    });
    setSdk(cbwsdk);
    const cbwprovider = cbwsdk.makeWeb3Provider('http');
    setProvider(cbwprovider);
  }, []);

  useEffect(() => {
    if (provider) {
      provider.on('connect', (info) => {
        console.info('connect', info);
      });
      provider.on('close', (error) => {
        console.info('close', error);
      });
      provider.on('accountsChanged', (accounts) => {
        console.info('accountsChanged', accounts);
      });
      provider.on('chainChanged', (chainId) => {
        console.info('chainChanged', chainId);
      });
      provider.on('networkChanged', (networkId) => {
        console.info('networkChanged', networkId);
      });
    }
  }, [provider]);

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
