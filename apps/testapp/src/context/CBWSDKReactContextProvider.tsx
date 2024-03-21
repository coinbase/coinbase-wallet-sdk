import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import React, { useEffect, useMemo } from 'react';

type CBWSDKProviderProps = {
  children: React.ReactNode;
};

const CBWSDKReactContext = React.createContext(null);
const SMART_WALLET_ONLY_KEY = 'smart_wallet_only';

export function CBWSDKReactContextProvider({ children }: CBWSDKProviderProps) {
  const [smartWalletOnly, setSmartWalletOnly] = React.useState<boolean | undefined>(undefined);
  const [sdk, setSdk] = React.useState(null);
  const [provider, setProvider] = React.useState(null);

  useEffect(() => {
    if (smartWalletOnly === undefined) {
      const smartWalletOnly = localStorage.getItem(SMART_WALLET_ONLY_KEY);
      setSmartWalletOnly(smartWalletOnly === 'true' ? true : false);
    }
  }, [smartWalletOnly]);

  useEffect(() => {
    const cbwsdk = new CoinbaseWalletSDK({
      appName: 'SDK Playground',
      smartWalletOnly,
    });
    setSdk(cbwsdk);
    const cbwprovider = cbwsdk.makeWeb3Provider();
    setProvider(cbwprovider);
    cbwprovider.on('disconnect', () => {
      location.reload();
    });
  }, [smartWalletOnly]);

  const setPreference = (smartWalletOnly: boolean) => {
    localStorage.setItem(SMART_WALLET_ONLY_KEY, smartWalletOnly.toString());
    setSmartWalletOnly(smartWalletOnly);
  };

  const ctx = useMemo(
    () => ({
      sdk,
      provider,
      smartWalletOnly,
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
