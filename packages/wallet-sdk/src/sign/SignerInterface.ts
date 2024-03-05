import { AccountsUpdate, ChainUpdate } from './UpdateListenerInterface';
import { AddressString } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';

export interface Signer {
  handshake(): Promise<AddressString[]>;
  request<T>(request: RequestArguments): Promise<T>;
  disconnect: () => Promise<void>;
}

export interface SignerUpdateListener {
  onAccountsUpdate: (signer: Signer, update: AccountsUpdate) => void;
  onChainUpdate: (signer: Signer, update: ChainUpdate) => void;
}
