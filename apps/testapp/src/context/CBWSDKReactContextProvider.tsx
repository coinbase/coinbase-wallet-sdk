import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import { ConnectionPreference } from '@coinbase/wallet-sdk/dist/core/communicator/ConnectionPreference';
import React, { useEffect, useMemo } from 'react';

type CBWSDKProviderProps = {
  children: React.ReactNode;
};

const CBWSDKReactContext = React.createContext(null);
const PREFERRED_CONNECTION_KEY = 'preferred_connection';

export function CBWSDKReactContextProvider({ children }: CBWSDKProviderProps) {
  const [connectionPreference, setConnectionPreference] = React.useState<
    ConnectionPreference | undefined
  >(undefined);
  const [sdk, setSdk] = React.useState(null);
  const [provider, setProvider] = React.useState(null);

  useEffect(() => {
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
  }, [connectionPreference]);

  useEffect(() => {
    const cbwsdk = new CoinbaseWalletSDK({
      appName: 'SDK Playground',
      connectionPreference: connectionPreference ?? 'default',
    });
    setSdk(cbwsdk);
    const cbwprovider = cbwsdk.makeWeb3Provider();
    setProvider(cbwprovider);
    cbwprovider.on('disconnect', () => {
      location.reload();
    });
  }, [connectionPreference]);

  const setPreference = (connectionPreference: ConnectionPreference) => {
    localStorage.setItem(PREFERRED_CONNECTION_KEY, connectionPreference);
    setConnectionPreference(connectionPreference);
  };

  const ctx = useMemo(
    () => ({
      sdk,
      provider,
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
