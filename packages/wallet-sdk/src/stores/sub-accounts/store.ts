import { LocalAccount } from 'viem';
import { WebAuthnAccount } from 'viem/account-abstraction';
import { createStore } from 'zustand/vanilla';

type SubAccountState = {
  getSigner: null | (() => Promise<WebAuthnAccount> | Promise<LocalAccount>);
};

export const SubAccount = createStore<SubAccountState>(() => ({
  getSigner: null,
}));
