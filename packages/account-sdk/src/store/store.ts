import { PACKAGE_VERSION } from ':core/constants.js';
import type { AppMetadata, Preference, SubAccountOptions } from ':core/provider/interface.js';
import { SpendPermission } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import type { Session } from ':core/session/index.js';
import { OwnerAccount } from ':core/type/index.js';
import { Address, Hex } from 'viem';
import { createJSONStorage, persist } from 'zustand/middleware';
import { StateCreator, createStore } from 'zustand/vanilla';

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
  deviceId?: string;
  paymasterUrls?: Record<number, string>;
};

type ChainSlice = { chains: Chain[] };
const createChainSlice: StateCreator<StoreState, [], [], ChainSlice> = () => ({ chains: [] });

/** ECDH transport keys (`KeyManager`), not sub-account owner keys. */
type KeysSlice = { keys: Record<string, string | null> };
const createKeysSlice: StateCreator<StoreState, [], [], KeysSlice> = () => ({ keys: {} });

type AccountSlice = { account: Account };
const createAccountSlice: StateCreator<StoreState, [], [], AccountSlice> = () => ({ account: {} });

type SubAccountSlice = { subAccount?: SubAccount };
const createSubAccountSlice: StateCreator<StoreState, [], [], SubAccountSlice> = () => ({
  subAccount: undefined,
});

type SubAccountConfigSlice = { subAccountConfig?: SubAccountConfig };
const createSubAccountConfigSlice: StateCreator<
  StoreState,
  [],
  [],
  SubAccountConfigSlice
> = () => ({
  subAccountConfig: {},
});

type SpendPermissionsSlice = { spendPermissions: SpendPermission[] };
const createSpendPermissionsSlice: StateCreator<
  StoreState,
  [],
  [],
  SpendPermissionsSlice
> = () => ({
  spendPermissions: [],
});

type ConfigSlice = { config: Config };
const createConfigSlice: StateCreator<StoreState, [], [], ConfigSlice> = () => ({
  config: { version: PACKAGE_VERSION },
});

type SessionSlice = { session?: Session };
const createSessionSlice: StateCreator<StoreState, [], [], SessionSlice> = () => ({
  session: undefined,
});

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
    SpendPermissionsSlice,
    ConfigSlice,
    SessionSlice,
  ]
>;

/**
 * Factory function to create a store instance.
 * Allows creating either persistent (for regular SDK) or ephemeral (for payment flows) stores.
 */
export function createStoreInstance(options?: {
  persist?: boolean;
  storageName?: string;
}) {
  const { persist: shouldPersist = true, storageName = 'base-acc-sdk.store' } = options ?? {};

  const storeCreator = (...args: Parameters<StateCreator<StoreState, [], []>>) => ({
    ...createChainSlice(...args),
    ...createKeysSlice(...args),
    ...createAccountSlice(...args),
    ...createSubAccountSlice(...args),
    ...createSubAccountConfigSlice(...args),
    ...createSpendPermissionsSlice(...args),
    ...createConfigSlice(...args),
    ...createSessionSlice(...args),
  });

  if (shouldPersist) {
    return createStore(
      persist<StoreState>(storeCreator, {
        name: storageName,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => {
          return {
            chains: state.chains,
            keys: state.keys,
            account: state.account,
            subAccount: state.subAccount,
            spendPermissions: state.spendPermissions,
            config: state.config,
            session: state.session,
          } as StoreState;
        },
      })
    );
  }
  return createStore(storeCreator);
}

/** Default persisted zustand instance. Ephemeral payment flows pass their own. */
export const defaultStoreInstance = createStoreInstance({ persist: true });

export type StoreInstance = ReturnType<typeof createStoreInstance>;

/**
 * Slice accessors for one zustand instance (persisted SDK store or an ephemeral payment store).
 * This is the object on `WalletRuntime.store` — `store.account.get()`, `store.session.set()`, …
 */
export function bindStore(storeInstance: StoreInstance) {
  return {
    subAccountsConfig: {
      get: () => storeInstance.getState().subAccountConfig,
      set: (subAccountConfig: Partial<SubAccountConfig>) => {
        storeInstance.setState((state) => ({
          subAccountConfig: { ...state.subAccountConfig, ...subAccountConfig },
        }));
      },
      clear: () => {
        storeInstance.setState({
          subAccountConfig: {},
        });
      },
    },

    subAccounts: {
      get: () => storeInstance.getState().subAccount,
      set: (subAccount: Partial<SubAccount>) => {
        storeInstance.setState((state) => ({
          subAccount: state.subAccount
            ? { ...state.subAccount, ...subAccount }
            : { address: subAccount.address as Address, ...subAccount },
        }));
      },
      clear: () => {
        storeInstance.setState({
          subAccount: undefined,
        });
      },
    },

    spendPermissions: {
      get: () => storeInstance.getState().spendPermissions,
      set: (spendPermissions: SpendPermission[]) => {
        storeInstance.setState({ spendPermissions });
      },
      clear: () => {
        storeInstance.setState({
          spendPermissions: [],
        });
      },
    },

    account: {
      get: () => storeInstance.getState().account,
      set: (account: Partial<Account>) => {
        storeInstance.setState((state) => ({
          account: { ...state.account, ...account },
        }));
      },
      clear: () => {
        storeInstance.setState({
          account: {},
        });
      },
    },

    chains: {
      get: () => storeInstance.getState().chains,
      set: (chains: Chain[]) => {
        storeInstance.setState({ chains });
      },
      clear: () => {
        storeInstance.setState({
          chains: [],
        });
      },
    },

    keys: {
      get: (key: string) => storeInstance.getState().keys[key],
      set: (key: string, value: string | null) => {
        storeInstance.setState((state) => ({ keys: { ...state.keys, [key]: value } }));
      },
      clear: () => {
        storeInstance.setState({
          keys: {},
        });
      },
    },

    config: {
      get: () => storeInstance.getState().config,
      set: (config: Partial<Config>) => {
        storeInstance.setState((state) => ({ config: { ...state.config, ...config } }));
      },
    },

    session: {
      get: (): Session | undefined => storeInstance.getState().session,
      set: (session: Session) => {
        storeInstance.setState({ session });
      },
      clear: () => {
        storeInstance.setState({ session: undefined });
      },
    },
  };
}

export type Store = ReturnType<typeof bindStore>;

const bound = bindStore(defaultStoreInstance);

export const subAccountsConfig = bound.subAccountsConfig;
export const subAccounts = bound.subAccounts;
export const spendPermissions = bound.spendPermissions;
export const account = bound.account;
export const chains = bound.chains;
export const keys = bound.keys;
export const config = bound.config;
export const session = bound.session;

type GlobalSdkPersistApi = {
  rehydrate: () => Promise<void> | void;
};

export const store = {
  ...defaultStoreInstance,
  ...bound,
  persist: (defaultStoreInstance as StoreInstance & { persist: GlobalSdkPersistApi }).persist,
};
