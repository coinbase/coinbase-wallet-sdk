import { ProviderInterface } from '@coinbase/wallet-sdk';
import { useToast } from '@chakra-ui/react';
import { useCallback } from 'react';

export const useEventListeners = () => {
  const toast = useToast();

  const handleConnect = useCallback(
    (info: { chainId: string }) => {
      // biome-ignore lint/suspicious/noConsole: developer feedback
      console.log('🟢 Connected:', info);
      toast({
        title: 'Connected',
        description: `chainId: ${info.chainId}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    },
    [toast]
  );

  const handleDisconnect = useCallback(() => {
    // biome-ignore lint/suspicious/noConsole: developer feedback
    console.log('🔴 Disconnect detected');
    toast({
      title: 'Disconnected',
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  }, [toast]);

  const handleAccountsChanged = useCallback(
    (accounts: string[]) => {
      // biome-ignore lint/suspicious/noConsole: developer feedback
      console.log('👤 Accounts changed:', accounts);
      toast({
        title: 'Accounts changed',
        description: `account: ${accounts.at(0)}`,
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    },
    [toast]
  );

  const handleChainChanged = useCallback(
    (chainId: string) => {
      // biome-ignore lint/suspicious/noConsole: developer feedback
      console.log('⛓️ Chain changed:', chainId);
      toast({
        title: 'Chain changed',
        description: `chainId: ${chainId}`,
        status: 'info',
        duration: 5000,
      });
    },
    [toast]
  );

  const addEventListeners = useCallback(
    (provider?: ProviderInterface) => {
      if (!provider) return;
      provider.on('connect', handleConnect);
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);
      provider.on('disconnect', handleDisconnect);
    },
    [handleConnect, handleAccountsChanged, handleChainChanged, handleDisconnect]
  );

  const removeEventListeners = useCallback(
    (provider?: ProviderInterface) => {
      if (!provider) return;
      provider.removeListener('connect', handleConnect);
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
      provider.removeListener('disconnect', handleDisconnect);
    },
    [handleConnect, handleAccountsChanged, handleChainChanged, handleDisconnect]
  );

  return { addEventListeners, removeEventListeners };
};
