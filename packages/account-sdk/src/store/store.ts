import { createJSONStorage, persist } from 'zustand/middleware';
import { StateCreator, createStore } from 'zustand/vanilla';
import pkg from '../../package.json' with { type: 'json' };
import type { AppMetadata, Preference, Session, SpendPermission } from '../storage/schema.js';

type Config = {
  metadata?: AppMetadata;
  preference?: Preference;
  version: string;
  deviceId?: string;
  paymasterUrls?: Record<number, string>;
};
type CoreConfig = Omit<Config, 'paymasterUrls'>;

/** ECDH transport keys (`KeyManager`), not sub-account owner keys. */
type KeysSlice = { keys: Record<string, string | null> };
const createKeysSlice: StateCreator<StoreState, [], [], KeysSlice> = () => ({ keys: {} });

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
  config: { version: pkg.version },
});

type SessionSlice = { session?: Session };
const createSessionSlice: StateCreator<StoreState, [], [], SessionSlice> = () => ({
  session: undefined,
});

type MergeTypes<T extends unknown[]> = T extends [infer First, ...infer Rest]
  ? First & (Rest extends unknown[] ? MergeTypes<Rest> : Record<string, unknown>)
  : Record<string, unknown>;

export type StoreState = MergeTypes<[KeysSlice, SpendPermissionsSlice, ConfigSlice, SessionSlice]>;

/**
 * Persisted schema version.
 *
 * v0 is the pre-CAIP blob: removed `account` / `chains` mirrors plus a `Session`
 * shape that predates `scopes` and `properties.chainMetadata`.
 */
const PERSISTED_STORE_VERSION = 1;

/**
 * Accept only a session the current selectors can read.
 *
 * v0 sessions carry `selected` (an SDK-chosen account per namespace) and `transportKind`,
 * and predate `properties.chainMetadata`, so they have no RPC URLs or native-currency data.
 * Dropping one costs a reconnect; keeping it fails every chain read instead.
 */
function persistedSession(value: unknown): Session | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = value as Partial<Session> & Record<string, unknown>;
  if ('selected' in candidate || 'transportKind' in candidate) return undefined;
  const { scopes } = candidate;
  if (!scopes || typeof scopes !== 'object' || Array.isArray(scopes)) return undefined;
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
    spendPermissions: state.spendPermissions ?? currentState.spendPermissions,
    config: { ...currentState.config, ...state.config },
    session: persistedSession(state.session),
  };
}

function migratePersistedState(persistedState: unknown, version: number): StoreState {
  const state = (persistedState ?? {}) as Partial<StoreState>;
  if (version >= PERSISTED_STORE_VERSION) return state as StoreState;
  return {
    keys: state.keys ?? {},
    spendPermissions: state.spendPermissions ?? [],
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
  const { persist: shouldPersist = true, storageName = 'base-acc-sdk.store' } = options ?? {};

  const storeCreator = (...args: Parameters<StateCreator<StoreState, [], []>>) => ({
    ...createKeysSlice(...args),
    ...createSpendPermissionsSlice(...args),
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
 * The backing state stays flat for persistence compatibility; the bound API namespaces EIP-155
 * state so shared infrastructure does not present itself as an EVM-only store.
 */
export function bindStore(storeInstance: StoreInstance) {
  const flat = {
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
      subscribe: (
        listener: (session: Session | undefined, previousSession: Session | undefined) => void
      ) =>
        storeInstance.subscribe((state, previous) => {
          if (state.session !== previous.session) listener(state.session, previous.session);
        }),
    },
  };

  return {
    keys: flat.keys,
    session: flat.session,
    config: {
      get: (): CoreConfig => {
        const { paymasterUrls: _, ...config } = flat.config.get();
        return config;
      },
      set: (config: Partial<CoreConfig>) => flat.config.set(config),
    },
    eip155: {
      spendPermissions: flat.spendPermissions,
      paymasterUrls: {
        get: () => flat.config.get().paymasterUrls,
        set: (paymasterUrls: Record<number, string> | undefined) =>
          flat.config.set({ paymasterUrls }),
      },
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
