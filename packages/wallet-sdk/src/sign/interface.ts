import { ProviderEventKey, ProviderEventValue, RequestArguments } from ':core/provider/interface';
import { AddressString } from ':core/type';

export interface Signer {
  readonly accounts: AddressString[];
  readonly chainId: number;
  handshake(): Promise<void>;
  request(request: RequestArguments): Promise<unknown>;
  disconnect: () => Promise<void>;
}

export type SignerUpdateCallback<
  K extends ProviderEventKey = ProviderEventKey,
  V = ProviderEventValue<K>,
> = (event: K, value: V) => void;
