import { RpcRequestInput } from './RpcRequestInput';

const ethRequestAccounts: RpcRequestInput = {
  method: 'eth_requestAccounts',
  params: [],
};

const ethAccounts: RpcRequestInput = {
  method: 'eth_accounts',
  params: [],
};

const walletConnect: RpcRequestInput = {
  method: 'wallet_connect',
  params: [
    {
      key: 'version',
      required: true,
    },
    {
      key: 'capabilities',
    },
  ],
  format: (data: Record<string, string>) => [
    {
      version: data.version,
      capabilities: data.capabilities,
    },
  ],
};

export const connectionMethods = [ethRequestAccounts, ethAccounts, walletConnect];
