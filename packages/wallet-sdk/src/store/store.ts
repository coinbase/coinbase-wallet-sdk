import { AppMetadata, Preference, SubAccountOptions } from ':core/provider/interface.js';
import { SpendLimit } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { OwnerAccount } from ':core/type/index.js';
import { Address, Hex } from 'viem';
import { createJSONStorage, persist } from 'zustand/middleware';
import { StateCreator, createStore } from 'zustand/vanilla';
import { VERSION } from '../sdk-info.js';

export type ToOwnerAccountFn = () => Promise<{
  account: OwnerAccount | null;
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

type SubAccountConfig = SubAccountOptions & {
  capabilities?: Record<string, unknown>;
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
  paymasterUrls?: Record<number, string>;
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

const createAccountSlice: StateCreator<StoreState, [], [], AccountSlice> = () => {
  return {
    account: {},
  };
};

type SubAccountSlice = {
  subAccount?: SubAccount;
};

const createSubAccountSlice: StateCreator<StoreState, [], [], SubAccountSlice> = () => {
  return {
    subAccount: undefined,
  };
};

type SubAccountConfigSlice = {
  subAccountConfig?: SubAccountConfig;
};

const createSubAccountConfigSlice: StateCreator<StoreState, [], [], SubAccountConfigSlice> = () => {
  return {
    subAccountConfig: {},
  };
};

type SpendLimitsSlice = {
  spendLimits: Record<number, SpendLimit[]>;
};

const createSpendLimitsSlice: StateCreator<StoreState, [], [], SpendLimitsSlice> = () => {
  return {
    spendLimits: {},
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
  ? First & (Rest extends unknown[] ? MergeTypes<Rest> : Record<string, unknown>)
  : Record<string, unknown>;

export type StoreState = MergeTypes<
  [
    ChainSlice,
    KeysSlice,
    AccountSlice,
    SubAccountSlice,
    SubAccountConfigSlice,
    SpendLimitsSlice,
    ConfigSlice,
  ]
>;

export const sdkstore = createStore(
  persist<StoreState>(
    (...args) => ({
      ...createChainSlice(...args),
      ...createKeysSlice(...args),
      ...createAccountSlice(...args),
      ...createSubAccountSlice(...args),
      ...createSpendLimitsSlice(...args),
      ...createConfigSlice(...args),
      ...createSubAccountConfigSlice(...args),
    }),
    {
      name: 'cbwsdk.store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // Explicitly select only the data properties we want to persist
        // (not the methods)
        return {
          chains: state.chains,
          keys: state.keys,
          account: state.account,
          subAccount: state.subAccount,
          spendLimits: state.spendLimits,
          config: state.config,
        } as StoreState;
      },
    }
  )
);

// Non-persisted subaccount configuration

export const subAccountsConfig = {
  get: () => sdkstore.getState().subAccountConfig,
  set: (subAccountConfig: Partial<SubAccountConfig>) => {
    sdkstore.setState((state) => ({
      subAccountConfig: { ...state.subAccountConfig, ...subAccountConfig },
    }));
  },
  clear: () => {
    sdkstore.setState({
      subAccountConfig: {},
    });
  },
};

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

export const spendLimits = {
  get: () => sdkstore.getState().spendLimits,
  set: (spendLimits: Record<number, SpendLimit[]>) => {
    sdkstore.setState((state) => ({ spendLimits: { ...state.spendLimits, ...spendLimits } }));
  },
  clear: () => {
    sdkstore.setState({
      spendLimits: {},
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
  subAccountsConfig,
  spendLimits,
  account,
  chains,
  keys,
  config,
};

export const store = {
  ...sdkstore,
  ...actions,
};
