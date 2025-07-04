import { PublicClient } from 'viem';

import { GetSubAccountSchema } from ':core/rpc/wallet_getSubAccount.js';

export type ExtendedRpcMethods = {
  getSubAccount: (args: GetSubAccountSchema['Parameters'][0]) => Promise<GetSubAccountSchema['ReturnType']>;
  // Add more non-standardmethods here as needed
};

// Configuration for RPC method extensions
export type RpcMethodConfig<T extends keyof ExtendedRpcMethods> = {
  methodName: T;
  rpcMethod: string;
  handler: (client: PublicClient, args: Parameters<ExtendedRpcMethods[T]>[0]) => ReturnType<ExtendedRpcMethods[T]>;
};

// Define all extended RPC methods here
// To add a new method, add a new configuration object to this array
export const extendedRpcMethods: RpcMethodConfig<keyof ExtendedRpcMethods>[] = [
  {
    methodName: 'getSubAccount',
    rpcMethod: 'wallet_getSubAccount',
    handler: (client, args) => client.request<GetSubAccountSchema>({
      method: 'wallet_getSubAccount',
      params: [args],
    }),
  },
];

// Generic function to create extended client
export function createExtendedClient(baseClient: PublicClient): PublicClient & ExtendedRpcMethods {
  return baseClient.extend((client) => {
    const extensions = {} as ExtendedRpcMethods;
    
    extendedRpcMethods.forEach((config) => {
      extensions[config.methodName] = (args: Parameters<ExtendedRpcMethods[typeof config.methodName]>[0]) => config.handler(client, args);
    });
    
    return extensions;
  });
} 