import { RequestArguments } from ':core/provider/interface';
import { AddressString, Chain } from ':core/type';

export interface Signer {
  handshake(): Promise<AddressString[]>;
  request<T>(request: RequestArguments): Promise<T>;
  disconnect: () => Promise<void>;
}

export interface StateUpdateListener {
  onAccountsUpdate: (_: AddressString[]) => void;
  onChainUpdate: (_: Chain) => void;
}
