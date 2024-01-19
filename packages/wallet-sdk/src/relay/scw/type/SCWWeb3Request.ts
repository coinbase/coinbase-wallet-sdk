import { UUID } from 'crypto';

import { Web3Request } from '../../walletlink/type/Web3Request';

export type SCWWeb3Request = {
  uuid: UUID;
  actions: Action[];
  timestamp: number;
};

const scwWeb3Method = ['requestEthereumAccounts', 'signEthereumTransaction'] as const;

export type SCWWeb3Method = (typeof scwWeb3Method)[number];

export type Action<M extends SCWWeb3Method = SCWWeb3Method> = Extract<Web3Request, { method: M }>;
