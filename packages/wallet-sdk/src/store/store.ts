import { createJSONStorage, persist } from 'zustand/middleware';
import { StateCreator, createStore } from 'zustand/vanilla';
import pkg from '../../package.json' with { type: 'json' };
import type { AppMetadata, Preference, Session } from '../storage/schema.js';
import {
  PERSISTED_STORE_VERSION,
  mergePersistedState,
  migratePersistedState,
} from './migrations.js';

type Config = {
  metadata?: AppMetadata;
  preference?: Preference;
  version: string;
  deviceId?: string;
};

/** ECDH transport keys (`KeyManager`). */
type KeysSlice = { keys: Record<string, string | null> };
const createKeysSlice: StateCreator<StoreState, [], [], KeysSlice> = () => ({ keys: {} });

type ConfigSlice = { config: Config };
const createConfigSlice: StateCreator<StoreState, [], [], ConfigSlice> = () => ({
  config: { version: pkg.version },
});

type SessionSlice = { session?: Session };
const createSessionSlice: StateCreator<StoreState, [], [], SessionSlice> = () => ({
  session: undefined,
});

/** The EIP-1193 provider's active chain id, saved and restored by `createActiveChain`. */
type ActiveChainSlice = { activeChainId?: number };
const createActiveChainSlice: StateCreator<StoreState, [], [], ActiveChainSlice> = () => ({
  activeChainId: undefined,
});

type MergeTypes<T extends unknown[]> = T extends [infer First, ...infer Rest]
  ? First & (Rest extends unknown[] ? MergeTypes<Rest> : Record<string, unknown>)
  : Record<string, unknown>;

export type StoreState = MergeTypes<[KeysSlice, ConfigSlice, SessionSlice, ActiveChainSlice]>;

/**
 * Factory function to create a store instance.
 * Allows creating either persistent (for regular SDK) or in-memory (for tests) stores.
 */
export function createStoreInstance(options?: {
  persist?: boolean;
  storageName?: string;
}) {
  const { persist: shouldPersist = true, storageName = 'coinbase-wallet-sdk.store' } =
    options ?? {};

  const storeCreator = (...args: Parameters<StateCreator<StoreState, [], []>>) => ({
    ...createKeysSlice(...args),
    ...createConfigSlice(...args),
    ...createSessionSlice(...args),
    ...createActiveChainSlice(...args),
  });

  if (shouldPersist) {
    return createStore(
      persist<StoreState>(storeCreator, {
        name: storageName,
        version: PERSISTED_STORE_VERSION,
        migrate: migratePersistedState,
        merge: mergePersistedState,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => {
          return {
            keys: state.keys,
            config: state.config,
            session: state.session,
            activeChainId: state.activeChainId,
          } as StoreState;
        },
      })
    );
  }
  return createStore(storeCreator);
}

/** Default persisted zustand instance. */
export const defaultStoreInstance = createStoreInstance({ persist: true });

export type StoreInstance = ReturnType<typeof createStoreInstance>;

/**
 * Slice accessors for one zustand instance.
 * The backing state stays flat for persistence compatibility.
 */
export function bindStore(storeInstance: StoreInstance) {
  const flat = {
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
      /** Notify on every change to the canonical session, with the new value. */
      subscribe: (listener: (session: Session | undefined) => void) =>
        storeInstance.subscribe((state, previous) => {
          if (state.session !== previous.session) listener(state.session);
        }),
    },

    activeChain: {
      get: () => storeInstance.getState().activeChainId,
      set: (activeChainId: number) => {
        storeInstance.setState({ activeChainId });
      },
    },
  };

  return {
    keys: flat.keys,
    session: flat.session,
    activeChain: flat.activeChain,
    config: {
      get: () => flat.config.get(),
      set: (config: Partial<Config>) => flat.config.set(config),
    },
  };
}

export type Store = ReturnType<typeof bindStore>;

const bound = bindStore(defaultStoreInstance);

type GlobalSdkPersistApi = {
  rehydrate: () => Promise<void> | void;
};

export const store = {
  ...defaultStoreInstance,
  ...bound,
  persist: (defaultStoreInstance as StoreInstance & { persist: GlobalSdkPersistApi }).persist,
};
