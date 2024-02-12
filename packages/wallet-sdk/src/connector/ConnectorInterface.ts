import { AddressString } from '../core/type';
import { RequestArguments } from '../provider/ProviderInterface';

export interface Connector {
  handshake(): Promise<AddressString[]>;
  request<T>(request: RequestArguments): Promise<T>;
  disconnect: () => void;
}

export type Chain = {
  id: number;
  rpcUrl?: string;
};

export interface ConnectorUpdateListener {
  onAccountsChanged: (connector: Connector, accounts: AddressString[]) => void;
  onChainChanged: (connector: Connector, chain: Chain) => void;
}
