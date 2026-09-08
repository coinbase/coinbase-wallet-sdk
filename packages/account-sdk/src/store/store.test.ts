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
