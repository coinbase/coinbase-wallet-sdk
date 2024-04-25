import { RequestArguments } from ':core/provider/interface';
import { AddressString, Chain } from ':core/type';

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
