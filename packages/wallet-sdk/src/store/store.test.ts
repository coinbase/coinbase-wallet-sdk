import { describe, expect, it } from 'vitest';
import { bindStore, createStoreInstance } from './store.js';

describe('bindStore', () => {
  it('exposes only the keys, session, and config slices', () => {
    const instance = createStoreInstance({ persist: false });
    const store = bindStore(instance);

    store.config.set({ deviceId: 'device' });

    expect(Object.keys(store).sort()).toEqual(['config', 'keys', 'session']);
    expect(store.config.get()).toMatchObject({ deviceId: 'device' });
    expect(store.config.get()).not.toHaveProperty('paymasterUrls');
    expect(instance.getState()).toMatchObject({
      config: {
        deviceId: 'device',
      },
    });
    // The SDK no longer mirrors wallet-owned EIP-155 state or caches spend permissions.
    expect(instance.getState()).not.toHaveProperty('account');
    expect(instance.getState()).not.toHaveProperty('chains');
    expect(instance.getState()).not.toHaveProperty('spendPermissions');
    expect(store).not.toHaveProperty('account');
    expect(store).not.toHaveProperty('eip155');
  });
});

type RehydratableStore = ReturnType<typeof createStoreInstance> & {
  persist: { rehydrate: () => Promise<void> | void };
};

describe('persisted store', () => {
  it('drops pre-CAIP persisted state and re-persists only the current keys', async () => {
    const storageName = 'migration-test.store';
    const account = '0x0000000000000000000000000000000000000001';
    localStorage.setItem(
      storageName,
      JSON.stringify({
        state: {
          // v0 shape: EIP-155 mirrors the SDK no longer owns.
          account: { accounts: [account], chain: { id: 8453 } },
          chains: [{ id: 8453, rpcUrl: 'https://legacy.invalid' }],
          keys: { ownPrivateKey: 'key-material' },
          spendPermissions: [],
          config: { version: 'legacy', deviceId: 'device' },
          session: {
            scopes: { 'eip155:8453': { accounts: [`eip155:8453:${account}`], methods: [] } },
            selected: { eip155: `eip155:8453:${account}` },
            transportKind: 'popup',
          },
        },
      })
    );

    const instance = createStoreInstance({ persist: true, storageName }) as RehydratableStore;
    await instance.persist.rehydrate();

    const state = instance.getState();
    // A v0 session predates properties.chainMetadata, so the selectors cannot read it.
    expect(state.session).toBeUndefined();
    expect(state.keys).toEqual({ ownPrivateKey: 'key-material' });
    expect(state.config).toMatchObject({ deviceId: 'device' });
    expect(state).not.toHaveProperty('account');
    expect(state).not.toHaveProperty('chains');

    // Force a re-persist so the written blob reflects the post-hydrate shape.
    instance.setState({ keys: instance.getState().keys });
    const persisted = JSON.parse(localStorage.getItem(storageName) as string);
    expect(persisted.version).toBe(2);
    // `session: undefined` is dropped by JSON serialization, so the legacy blob is gone.
    expect(Object.keys(persisted.state).sort()).toEqual(['config', 'keys']);

    localStorage.removeItem(storageName);
  });

  it('drops a v1 chain-keyed session and keeps a namespace-keyed one', async () => {
    const account = '0x0000000000000000000000000000000000000001';

    // v1 keyed grants by CAIP-2 chain id; the current selectors read `namespaces` only.
    const chainKeyed = 'migration-v1.store';
    localStorage.setItem(
      chainKeyed,
      JSON.stringify({
        version: 1,
        state: {
          keys: {},
          spendPermissions: [],
          config: { version: 'legacy' },
          session: {
            sessionId: 'session-1',
            scopes: { 'eip155:0': { accounts: [account], methods: ['personal_sign'] } },
          },
        },
      })
    );
    const stale = createStoreInstance({
      persist: true,
      storageName: chainKeyed,
    }) as RehydratableStore;
    await stale.persist.rehydrate();
    expect(stale.getState().session).toBeUndefined();
    localStorage.removeItem(chainKeyed);

    const namespaceKeyed = 'migration-v2.store';
    const session = {
      sessionId: 'session-1',
      namespaces: { eip155: { accounts: [account], methods: ['personal_sign'] } },
    };
    localStorage.setItem(
      namespaceKeyed,
      JSON.stringify({
        version: 2,
        state: { keys: {}, spendPermissions: [], config: { version: 'current' }, session },
      })
    );
    const current = createStoreInstance({
      persist: true,
      storageName: namespaceKeyed,
    }) as RehydratableStore;
    await current.persist.rehydrate();
    expect(current.getState().session).toEqual(session);
    localStorage.removeItem(namespaceKeyed);
  });
});
