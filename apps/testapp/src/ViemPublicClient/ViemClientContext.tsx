// ViemClientContext.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { createPublicClient, extractChain, http } from 'viem';
import * as allViemChains from 'viem/chains';

// Define the context shape
export interface ViemClientContextType {
  client: ReturnType<typeof createPublicClient> | null;
}

const ViemClientContext = createContext<ViemClientContextType | undefined>(undefined);

export const ViemClientProvider = ({ children, provider }) => {
  const chain = useMemo(
    () => extractChain({ chains: Object.values(allViemChains), id: provider?.chainId }),
    [provider?.chainId]
  );

  const client = useMemo(() => {
    const newClient = createPublicClient({
      chain,
      transport: http(),
    });
    return newClient;
  }, [chain.id]); // update the client when chain changes

  return <ViemClientContext.Provider value={{ client }}>{children}</ViemClientContext.Provider>;
};

// Hook to use the client
export const useViemPublicClient = () => {
  const context = useContext(ViemClientContext);
  if (context === undefined) {
    throw new Error('useViemPublicClient must be used within a ViemClientProvider');
  }
  return context.client;
};
