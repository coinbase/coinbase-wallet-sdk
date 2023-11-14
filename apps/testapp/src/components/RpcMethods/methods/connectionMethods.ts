import { RpcMethod } from '../RpcMethod';

const ethRequestAccounts = {
  method: 'eth_requestAccounts',
  params: [],
};

const ethAccounts = {
  method: 'eth_accounts',
  params: [],
};

export const connectionMethods: RpcMethod[] = [ethRequestAccounts, ethAccounts];
