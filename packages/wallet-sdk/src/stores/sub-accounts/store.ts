import { Address, Hex, LocalAccount, type OneOf } from 'viem';
import { WebAuthnAccount } from 'viem/account-abstraction';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

export type GetSubAccountSigner = () => Promise<{
  account: OneOf<LocalAccount | WebAuthnAccount> | null;
}>;

export type SubAccountInfo = {
  universalAccount: Address;
  address: Address;
  chainId?: number;
  factory?: Address;
  factoryData?: Hex;
};

export type SubAccountState = {
  getSigner: null | GetSubAccountSigner;
  account?: SubAccountInfo;
};

export const subaccounts = createStore(
  persist<Partial<SubAccountState>>(
    () => ({
      getSigner: null,
    }),
    {
      name: 'cbwsdk.subaccount',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        account: state.account,
      }),
    }
  )
);
