import { AddressString } from ':core/type';
import { RequestArguments } from ':core/type/provider';

export interface Signer {
  readonly accounts: AddressString[];
  readonly chainId: number;
  handshake(): Promise<void>;
  request(request: RequestArguments): Promise<unknown>;
  disconnect: () => Promise<void>;
}

export interface StateUpdateListener {
  onAccountsUpdate: (_: AddressString[]) => void;
  onChainIdUpdate: (_: number) => void;
}
