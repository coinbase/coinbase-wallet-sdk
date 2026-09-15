import { describe, expect, it } from 'vitest';
import { bindStore, createStoreInstance } from './store.js';

describe('bindStore', () => {
  it('keeps only local EIP-155 caches outside the canonical session', () => {
    const instance = createStoreInstance({ persist: false });
    const store = bindStore(instance);
    const account = '0x0000000000000000000000000000000000000001';

    store.config.set({ deviceId: 'device' });
    store.eip155.subAccounts.set({ address: account });
    store.eip155.paymasterUrls.set({ 8453: 'https://paymaster.example' });

    expect(store.config.get()).toMatchObject({ deviceId: 'device' });
    expect(store.config.get()).not.toHaveProperty('paymasterUrls');
    expect(store.eip155).not.toHaveProperty('account');
    expect(store.eip155).not.toHaveProperty('chains');
    expect(store.eip155.paymasterUrls.get()).toEqual({
      8453: 'https://paymaster.example',
    });
    expect(instance.getState()).toMatchObject({
      subAccount: { address: account },
      config: {
        deviceId: 'device',
        paymasterUrls: { 8453: 'https://paymaster.example' },
      },
    });
    expect(instance.getState()).not.toHaveProperty('account');
    expect(instance.getState()).not.toHaveProperty('chains');
    expect(store).not.toHaveProperty('account');
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
          subAccount: { address: account },
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
    expect(state.subAccount).toEqual({ address: account });
    expect(state.config).toMatchObject({ deviceId: 'device' });
    expect(state).not.toHaveProperty('account');
    expect(state).not.toHaveProperty('chains');

    instance.setState({ spendPermissions: [] });
    const persisted = JSON.parse(localStorage.getItem(storageName) as string);
    expect(persisted.version).toBe(1);
    // `session: undefined` is dropped by JSON serialization, so the legacy blob is gone.
    expect(Object.keys(persisted.state).sort()).toEqual([
      'config',
      'keys',
      'spendPermissions',
      'subAccount',
    ]);

    localStorage.removeItem(storageName);
  });
});
