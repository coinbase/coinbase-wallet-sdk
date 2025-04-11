import { AppMetadata, Preference } from ":core/provider/interface.js";
import { Address, Hex, LocalAccount, OneOf } from "viem";
import { WebAuthnAccount } from "viem/account-abstraction";
import { createJSONStorage, persist } from "zustand/middleware";
import { StateCreator, createStore } from "zustand/vanilla";
import { VERSION } from "../sdk-info.js";

export type ToSubAccountSigner = () => Promise<{
  account: OneOf<LocalAccount | WebAuthnAccount> | null;
}>;

type Chain = {
  id: number;
  rpcUrl?: string;
  nativeCurrency?: {
    name?: string;
    symbol?: string;
    decimal?: number;
  };
};

export type SubAccount = {
  address: Address;
  factory?: Address;
  factoryData?: Hex;
};

type Account = {
  accounts?: Address[];
  capabilities?: Record<string, unknown>;
  chain?: Chain;
};

type Config = {
  metadata?: AppMetadata;
  preference?: Preference;
  version: string;
};

type ChainSlice = {
  chains: Chain[];
};

const createChainSlice: StateCreator<StoreState, [], [], ChainSlice> = () => {
  return {
    chains: [],
  };
};

type KeysSlice = {
  keys: Record<string, string | null>;
};

const createKeysSlice: StateCreator<StoreState, [], [], KeysSlice> = () => {
  return {
    keys: {},
  };
};

type AccountSlice = {
  account: Account;
};

const createAccountSlice: StateCreator<
  StoreState,
  [],
  [],
  AccountSlice
> = () => {
  return {
    account: {},
  };
};

type SubAccountSlice = {
  subAccount?: SubAccount;
};

const createSubAccountSlice: StateCreator<
  StoreState,
  [],
  [],
  SubAccountSlice
> = () => {
  return {
    subAccount: undefined,
  };
};

type ConfigSlice = {
  config: Config;
};

const createConfigSlice: StateCreator<StoreState, [], [], ConfigSlice> = () => {
  return {
    config: {
      version: VERSION,
    },
  };
};

type MergeTypes<T extends unknown[]> = T extends [infer First, ...infer Rest]
  ? First &
      (Rest extends unknown[] ? MergeTypes<Rest> : Record<string, unknown>)
  : Record<string, unknown>;

export type StoreState = MergeTypes<
  [
    ChainSlice,
    KeysSlice,
    AccountSlice,
    SubAccountSlice,
    ConfigSlice,
    { toSubAccountSigner?: ToSubAccountSigner }
  ]
>;

export const sdkstore = createStore(
  persist<StoreState>(
    (...args) => ({
      ...createChainSlice(...args),
      ...createKeysSlice(...args),
      ...createAccountSlice(...args),
      ...createSubAccountSlice(...args),
      ...createConfigSlice(...args),
      toSubAccountSigner: undefined,
    }),
    {
      name: "cbwsdk.store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Explicitly select only the data properties we want to persist
        // (not the methods)
        return {
          chains: state.chains,
          keys: state.keys,
          account: state.account,
          subAccount: state.subAccount,
          config: state.config,
        } as StoreState;
      },
    }
  )
);

export const subAccounts = {
  get: () => sdkstore.getState().subAccount,
  set: (subAccount: Partial<SubAccount>) => {
    sdkstore.setState((state) => ({
      subAccount: state.subAccount
        ? { ...state.subAccount, ...subAccount }
        : { address: subAccount.address as Address, ...subAccount },
    }));
  },
  clear: () => {
    sdkstore.setState({
      subAccount: undefined,
    });
  },
};

export const account = {
  get: () => sdkstore.getState().account,
  set: (account: Partial<Account>) => {
    sdkstore.setState((state) => ({
      account: { ...state.account, ...account },
    }));
  },
  clear: () => {
    sdkstore.setState({
      account: {},
    });
  },
};

export const chains = {
  get: () => sdkstore.getState().chains,
  set: (chains: Chain[]) => {
    sdkstore.setState({ chains });
  },
  clear: () => {
    sdkstore.setState({
      chains: [],
    });
  },
};

export const keys = {
  get: (key: string) => sdkstore.getState().keys[key],
  set: (key: string, value: string | null) => {
    sdkstore.setState((state) => ({ keys: { ...state.keys, [key]: value } }));
  },
  clear: () => {
    sdkstore.setState({
      keys: {},
    });
  },
};

export const config = {
  get: () => sdkstore.getState().config,
  set: (config: Partial<Config>) => {
    sdkstore.setState((state) => ({ config: { ...state.config, ...config } }));
  },
};

const actions = {
  subAccounts,
  account,
  chains,
  keys,
  config,
  setSubAccountSigner: (toSubAccountSigner: ToSubAccountSigner) => {
    sdkstore.setState({ toSubAccountSigner });
  },
};

export const store = {
  ...sdkstore,
  ...actions,
};
