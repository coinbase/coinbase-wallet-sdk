import pkg from '../../package.json' with { type: 'json' };
import type { Session } from '../storage/schema.js';
import type { StoreState } from './store.js';

/**
 * Persisted schema version.
 *
 * v0 is the pre-CAIP blob. v1 keyed `Session.scopes` by CAIP-2 chain id; v2 keys grants
 * by CAIP-104 namespace, because EVM authorization covers every chain at once.
 */
export const PERSISTED_STORE_VERSION = 2;

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

/** A stored EVM chain id, or `undefined` when the stored value is not one. */
function parseActiveChainId(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

/**
 * Rebuild hydrated state from the current keys only.
 *
 * `migrate` runs only when the stored blob carries a numeric `version`, and v0 was
 * written without one, so shape-based sanitizing has to happen on every hydrate.
 * Unknown top-level keys (the removed `account` / `chains` mirrors) are dropped here.
 */
export function mergePersistedState(persistedState: unknown, currentState: StoreState): StoreState {
  const state = (persistedState ?? {}) as Partial<StoreState>;
  return {
    ...currentState,
    keys: state.keys ?? currentState.keys,
    config: { ...currentState.config, ...state.config },
    session: persistedSession(state.session),
    activeChainId: parseActiveChainId(state.activeChainId),
  };
}

export function migratePersistedState(persistedState: unknown, version: number): StoreState {
  const state = (persistedState ?? {}) as Partial<StoreState>;
  if (version >= PERSISTED_STORE_VERSION) return state as StoreState;
  return {
    keys: state.keys ?? {},
    config: state.config ?? { version: pkg.version },
    // Same rule as `mergePersistedState`, for blobs that do carry an older version.
    session: persistedSession(state.session),
  } as StoreState;
}
