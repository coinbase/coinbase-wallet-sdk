import { AddressString, Chain } from '../core/type';
import { RequestArguments } from '../provider/ProviderInterface';

export interface Signer {
  handshake(): Promise<AddressString[]>;
  request<T>(request: RequestArguments): Promise<T>;
  disconnect: () => Promise<void>;
}

export interface SignerUpdateListener {
  onAccountsChanged: (signer: Signer, accounts: AddressString[]) => void;
  onChainChanged: (signer: Signer, chain: Chain) => void;
}
