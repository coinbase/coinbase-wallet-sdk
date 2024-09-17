import { RpcRequestInput } from './RpcRequestInput';

const ethRequestAccounts: RpcRequestInput = {
  method: 'eth_requestAccounts',
  params: [],
};

const ethAccounts: RpcRequestInput = {
  method: 'eth_accounts',
  params: [],
};

export const connectionMethods = [ethRequestAccounts, ethAccounts];
