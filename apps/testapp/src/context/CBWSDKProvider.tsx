import React from 'react';

type CBWSDKProviderProps = {
  children: React.ReactNode;
};

const CBWSDKContext = React.createContext(null);

export function CBWSDKProvider({ children }: CBWSDKProviderProps) {
  return <CBWSDKContext.Provider value={null}>{children}</CBWSDKContext.Provider>;
}
