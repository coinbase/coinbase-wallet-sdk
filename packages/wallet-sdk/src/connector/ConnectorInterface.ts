import { AddressString } from '../core/type';
import { RequestArguments } from '../provider/ProviderInterface';

export interface Connector {
  handshake(): Promise<AddressString[]>;
  request<T>(request: RequestArguments): Promise<T>;
}

export interface ConnectorUpdateListener {
  onChainChanged(connector: Connector, chainId: number, rpcUrl: string): void;
}
