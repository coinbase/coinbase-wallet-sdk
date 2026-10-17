import { createJSONStorage, persist } from 'zustand/middleware';
import { StateCreator, createStore } from 'zustand/vanilla';
import pkg from '../../package.json' with { type: 'json' };
import type { AppMetadata, Preference, Session } from '../storage/schema.js';

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

type MergeTypes<T extends unknown[]> = T extends [infer First, ...infer Rest]
  ? First & (Rest extends unknown[] ? MergeTypes<Rest> : Record<string, unknown>)
  : Record<string, unknown>;

export type StoreState = MergeTypes<[KeysSlice, ConfigSlice, SessionSlice]>;

/**
 * Persisted schema version.
 *
 * v0 is the pre-CAIP blob. v1 keyed `Session.scopes` by CAIP-2 chain id; v2 keys grants
 * by CAIP-104 namespace, because EVM authorization covers every chain at once.
 */
const PERSISTED_STORE_VERSION = 2;

/**
 * Accept only a session the current selectors can read.
 *
 * Older sessions keyed grants by chain (`scopes`) or carried SDK-chosen state
 * (`selected`, `transportKind`). Dropping one costs a single reconnect; keeping it would
 * silently leave the provider with no readable authorization.
 */
function persistedSession(value: unknown): Session | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Partial<Session> & Record<string, unknown>;
  if ('selected' in candidate || 'transportKind' in candidate || 'scopes' in candidate) {
    return undefined;
  }
  const { namespaces } = candidate;
  if (!namespaces || typeof namespaces !== 'object' || Array.isArray(namespaces)) {
    return undefined;
  }
  return candidate as Session;
}

/**
 * Rebuild hydrated state from the current keys only.
 *
 * `migrate` runs only when the stored blob carries a numeric `version`, and v0 was
 * written without one, so shape-based sanitizing has to happen on every hydrate.
 * Unknown top-level keys (the removed `account` / `chains` mirrors) are dropped here.
 */
function mergePersistedState(persistedState: unknown, currentState: StoreState): StoreState {
  const state = (persistedState ?? {}) as Partial<StoreState>;
  return {
    ...currentState,
    keys: state.keys ?? currentState.keys,
    config: { ...currentState.config, ...state.config },
    session: persistedSession(state.session),
  };
}

function migratePersistedState(persistedState: unknown, version: number): StoreState {
  const state = (persistedState ?? {}) as Partial<StoreState>;
  if (version >= PERSISTED_STORE_VERSION) return state as StoreState;
  return {
    keys: state.keys ?? {},
    config: state.config ?? { version: pkg.version },
    // Same rule as `mergePersistedState`, for blobs that do carry an older version.
    session: persistedSession(state.session),
  } as StoreState;
}

/**
 * Factory function to create a store instance.
 * Allows creating either persistent (for regular SDK) or ephemeral (for payment flows) stores.
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
  };

  return {
    keys: flat.keys,
    session: flat.session,
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
