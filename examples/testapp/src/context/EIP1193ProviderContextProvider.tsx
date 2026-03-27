import { createCoinbaseWalletSDK as createCoinbaseWalletSDKHEAD } from '@coinbase/wallet-sdk';
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
    | ReturnType<typeof createCoinbaseWalletSDKHEAD>
    | ReturnType<typeof createCoinbaseWalletSDKLatest>;
  provider: ReturnType<EIP1193ProviderContextType['sdk']['getProvider']>;
};

const EIP1193ProviderContext = createContext<EIP1193ProviderContextType | null>(null);

export function EIP1193ProviderContextProvider({ children }: EIP1193ProviderContextProviderProps) {
  const { option, version, scwUrl, config, subAccountsConfig } = useConfig();
  const { addEventListeners, removeEventListeners } = useEventListeners();
  const {
    spyOnDisconnectedError,
    isOpen: isDisconnectedAlertOpen,
    onClose: onDisconnectedAlertClose,
  } = useSpyOnDisconnectedError();

  const [sdk, setSdk] = useState(null);
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    const sdkParams = {
      appName: 'SDK Playground',
      appChainIds: [84532, 8452],
      preference: {
        options: option ?? 'all',
        attribution: config.attribution,
        keysUrl: scwUrl ?? scwUrls[0],
      },
      subAccounts: subAccountsConfig,
    };

    const sdk =
      version === 'HEAD'
        ? createCoinbaseWalletSDKHEAD(sdkParams)
        : createCoinbaseWalletSDKLatest(sdkParams);

    setSdk(sdk);

    const newProvider = sdk.getProvider();
    // biome-ignore lint/suspicious/noConsole: developer feedback
    console.log('Provider:', newProvider);

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
    subAccountsConfig,
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
