import { RequestArguments } from ':core/provider/interface';
import { AddressString, Chain } from ':core/type';

export interface Signer {
  readonly accounts: AddressString[];
  readonly chain: Chain;
  handshake(): Promise<AddressString[]>;
  request<T>(request: RequestArguments): Promise<T>;
  disconnect: () => Promise<void>;
}

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
