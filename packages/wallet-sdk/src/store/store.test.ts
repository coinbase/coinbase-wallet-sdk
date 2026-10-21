import { describe, expect, it } from 'vitest';
import { bindStore, createStoreInstance } from './store.js';

describe('bindStore', () => {
  it('exposes only the keys, session, config, and active chain slices', () => {
    const instance = createStoreInstance({ persist: false });
    const store = bindStore(instance);

    store.config.set({ deviceId: 'device' });

    expect(Object.keys(store).sort()).toEqual(['activeChain', 'config', 'keys', 'session']);
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
