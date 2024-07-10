import { AddressString, IntNumber } from ':core/type';

export interface StateUpdateListener {
  onAccountsUpdate: (_: AddressString[]) => void;
  onChainIdUpdate: (_: IntNumber) => void;
}
