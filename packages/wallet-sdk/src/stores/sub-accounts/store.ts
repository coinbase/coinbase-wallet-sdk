import { Address, Hex, LocalAccount } from 'viem';
import { WebAuthnAccount } from 'viem/account-abstraction';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';

export type SubAccountInfo = {
  address: Address;
  chainId: number;
  owners: Address[];
  ownerIndex: number;
  root: Address;
  initCode: {
    factory: Address;
    factoryCalldata: Hex;
  };
};

export type SubAccountState = {
  getSigner: null | (() => Promise<WebAuthnAccount>) | (() => Promise<LocalAccount>);
  account?: SubAccountInfo;
};

export const SubAccount = createStore(
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
