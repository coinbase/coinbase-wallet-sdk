import { AddressString, Chain } from ':core/type';

export interface StateUpdateListener {
  onAccountsUpdate: (_: AddressString[]) => void;
  onChainUpdate: (_: Chain) => void;
}
