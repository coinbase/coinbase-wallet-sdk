import { CoinbaseWalletSDK as CoinbaseWalletSDKHEAD } from '@coinbase/wallet-sdk';
import { createCoinbaseWalletSDK as createCoinbaseWalletSDKLatest } from '@coinbase/wallet-sdk-latest';

import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DisconnectedAlert } from '../components/alerts/DisconnectedAlert';
import { useEventListeners } from '../hooks/useEventListeners';
import { useSpyOnDisconnectedError } from '../hooks/useSpyOnDisconnectedError';
import { scwUrls } from '../store/config';
import { useConfig } from './ConfigContextProvider';

type EIP1193ProviderContextProviderProps = {
  children: ReactNode;
};

type EIP1193ProviderContextType = {
  sdk:
    | InstanceType<typeof CoinbaseWalletSDKHEAD>
    | ReturnType<typeof createCoinbaseWalletSDKLatest>;
  provider: any; // Replace with the correct type if available, or use 'any' as a temporary fix.
};

const EIP1193ProviderContext = createContext<EIP1193ProviderContextType | null>(null);

export function EIP1193ProviderContextProvider({ children }: EIP1193ProviderContextProviderProps) {
  const { option, version, scwUrl, config } = useConfig();
  const { addEventListeners, removeEventListeners } = useEventListeners();
  const {
    spyOnDisconnectedError,
    isOpen: isDisconnectedAlertOpen,
    onClose: onDisconnectedAlertClose,
  } = useSpyOnDisconnectedError();

  const [sdk, setSdk] = useState<EIP1193ProviderContextType['sdk'] | null>(null);
  const [provider, setProvider] = useState<EIP1193ProviderContextType['provider'] | null>(null);

  useEffect(() => {
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
        ? new CoinbaseWalletSDKHEAD(sdkParams)
        : createCoinbaseWalletSDKLatest(sdkParams);

    setSdk(sdk);

    const newProvider = 
      'getProvider' in sdk ? sdk.getProvider() : null;
    setProvider(newProvider);

    addEventListeners(newProvider);
    spyOnDisconnectedError(newProvider);

    // @ts-ignore convenience for testing
    setTimeout("alert('Hi!')", 50); // equivalent to using window.setTimeout().
alert(window === window.window); // displays "true"


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
  const context = useContext(EIP1193ProviderContext);
  if (context === undefined) {
    throw new Error('useEIP1193Provider must be used within a EIP1193ProviderContextProvider');
  }
  return context;
}
