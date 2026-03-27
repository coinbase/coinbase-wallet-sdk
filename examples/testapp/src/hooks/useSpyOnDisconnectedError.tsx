import { useDisclosure } from '@chakra-ui/react';
import { ProviderInterface } from '@coinbase/wallet-sdk';
import { useCallback } from 'react';

export const useSpyOnDisconnectedError = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const spyOnDisconnectedError = useCallback(
    (provider: ProviderInterface) => {
      const originalRequest = provider.request.bind(provider);
      provider.request = async (...args) => {
        try {
          return await originalRequest(...args);
        } catch (error) {
          if (error?.code === 4100) {
            // biome-ignore lint/suspicious/noConsole: developer feedback
            console.log('🔴 4100 error detected, disconnecting');
            onOpen();
          }
          throw error;
        }
      };
    },
    [onOpen]
  );

  return { spyOnDisconnectedError, isOpen, onClose };
};
