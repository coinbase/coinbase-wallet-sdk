import { createCoinbaseWalletSDK as createCoinbaseWalletSDKHEAD } from '@coinbase/wallet-sdk';
import { createCoinbaseWalletSDK as createCoinbaseWalletSDKLatest } from '@coinbase/wallet-sdk-latest';

import React, { useEffect, useMemo } from 'react';
import { DisconnectedAlert } from '../components/alerts/DisconnectedAlert';
import { useEventListeners } from '../hooks/useEventListeners';
import { useSpyOnDisconnectedError } from '../hooks/useSpyOnDisconnectedError';
import { scwUrls } from '../store/config';
import { cleanupSDKLocalStorage } from '../utils/cleanupSDKLocalStorage';
import { useConfigParams } from './ConfigParamsContextProvider';

type EIP1193ProviderContextProviderProps = {
  children: React.ReactNode;
};

const EIP1193ProviderContext = React.createContext(null);

export function EIP1193ProviderContextProvider({ children }: EIP1193ProviderContextProviderProps) {
  const { option, version, scwUrl, config } = useConfigParams();
  const { addEventListeners, removeEventListeners } = useEventListeners();
  const {
    spyOnDisconnectedError,
    isOpen: isDisconnectedAlertOpen,
    onClose: onDisconnectedAlertClose,
  } = useSpyOnDisconnectedError();

  const [sdk, setSdk] = React.useState(null);
  const [provider, setProvider] = React.useState(null);

  useEffect(() => {
    cleanupSDKLocalStorage();

    const sdkParams = {
      appName: 'SDK Playground',
      appChainIds: [84532, 8452],
      preference: {
        options: option ?? 'all',
        attribution: config.attribution,
        keysUrl: scwUrl ?? scwUrls[0],
      },
    };

    const sdk =
      version === 'HEAD'
        ? createCoinbaseWalletSDKHEAD(sdkParams)
        : createCoinbaseWalletSDKLatest(sdkParams);

    setSdk(sdk);

    const newProvider = sdk.getProvider();
    addEventListeners(newProvider);
    spyOnDisconnectedError(newProvider);

    // @ts-ignore convenience for testing
    window.ethereum = newProvider;
    setProvider(newProvider);

    return () => {
      removeEventListeners(newProvider);
    };
  }, [
    scwUrl,
    version,
    option,
    config,
    spyOnDisconnectedError,
    addEventListeners,
    removeEventListeners,
  ]);

  const value = useMemo(
    () => ({
      sdk,
      provider,
    }),
    [sdk, provider]
  );

  return (
    <EIP1193ProviderContext.Provider value={value}>
      <>
        {children}
        <DisconnectedAlert isOpen={isDisconnectedAlertOpen} onClose={onDisconnectedAlertClose} />
      </>
    </EIP1193ProviderContext.Provider>
  );
}

export function useEIP1193Provider() {
  const context = React.useContext(EIP1193ProviderContext);
  if (context === undefined) {
    throw new Error('useEIP1193Provider must be used within a EIP1193ProviderContextProvider');
  }
  return context;
}
