import { AddressString } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';

export interface Signer {
  handshake(): Promise<AddressString[]>;
  request<T>(request: RequestArguments): Promise<T>;
  disconnect: () => Promise<void>;
}
