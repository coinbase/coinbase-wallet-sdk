import { RequestArguments } from ':core/provider/interface';
import { AddressString } from ':core/type';

export interface Signer {
  readonly accounts: AddressString[];
  readonly chainId: number;
  handshake(): Promise<AddressString[]>;
  request(request: RequestArguments): Promise<unknown>;
  disconnect: () => Promise<void>;
}

export interface StateUpdateListener {
  onAccountsUpdate: (_: AddressString[]) => void;
  onChainIdUpdate: (_: number) => void;
}
