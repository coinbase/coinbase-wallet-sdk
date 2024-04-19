import { AddressString, Chain } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';

export interface Signer {
  handshake(): Promise<AddressString[]>;
  request<T>(request: RequestArguments): Promise<T>;
  disconnect: () => Promise<void>;
}

type UpdateSource = 'wallet' | 'storage';

export interface AccountsUpdate {
  accounts: AddressString[];
  source: UpdateSource;
}

export interface ChainUpdate {
  chain: Chain;
  source: UpdateSource;
}

export interface StateUpdateListener {
  onAccountsUpdate: (_: AccountsUpdate) => void;
  onChainUpdate: (_: ChainUpdate) => void;
}

export interface SignRequestHandlerListener extends StateUpdateListener {
  onConnect: () => void;
  onResetConnection: () => void;
}
