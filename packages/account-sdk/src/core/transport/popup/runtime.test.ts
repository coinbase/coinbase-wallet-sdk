import { createStoreInstance } from ':store/store.js';
import { createPopup } from './runtime.js';

vi.mock('./Communicator.js', () => ({
  Communicator: class {
    postRequestAndWaitForResponse = vi.fn();
    waitForPopupLoaded = vi.fn();
  },
}));

vi.mock('./handshake.js', () => ({
  handshake: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./send.js', () => ({
  send: vi.fn().mockResolvedValue('0xok'),
}));

const metadata = { appName: 'Test', appLogoUrl: null, appChainIds: [8453] };
const preference = { telemetry: false };

describe('createPopup', () => {
  it('does not treat legacy account state as CAIP authorization', () => {
    const storeInstance = createStoreInstance({ persist: false });
    const runtime = createPopup({ metadata, preference, storeInstance });
    expect(runtime.readSession()).toBeUndefined();

    runtime.store.account.set({
      accounts: ['0xabcabcabcabcabcabcabcabcabcabcabcabcabca'],
      chain: { id: 8453 },
    });
    expect(runtime.readSession()).toBeUndefined();
  });

  it('ignores an accountless persisted session', () => {
    const storeInstance = createStoreInstance({ persist: false });
    const runtime = createPopup({ metadata, preference, storeInstance });
    runtime.writeSession({ scopes: {}, selected: {}, transportKind: 'popup' });
    expect(runtime.readSession()).toBeUndefined();
  });

  it('ignores a pre-CAIP persisted session without a session id', () => {
    const runtime = createPopup({
      metadata,
      preference,
      storeInstance: createStoreInstance({ persist: false }),
    });
    runtime.writeSession({
      scopes: {
        'eip155:8453': {
          accounts: ['eip155:8453:0xabcabcabcabcabcabcabcabcabcabcabcabcabca'],
          methods: ['personal_sign'],
        },
      },
      selected: { eip155: 'eip155:8453:0xabcabcabcabcabcabcabcabcabcabcabcabcabca' },
      transportKind: 'popup',
    });
    expect(runtime.readSession()).toBeUndefined();
  });

  it('wraps an envelope as wallet_invokeMethod before popup send', async () => {
    const { send } = await import('./send.js');
    const runtime = createPopup({
      metadata,
      preference,
      storeInstance: createStoreInstance({ persist: false }),
    });
    await runtime.transport.send({
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x01'] },
    });
    expect(send).toHaveBeenCalledWith(expect.anything(), {
      method: 'wallet_invokeMethod',
      params: {
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: ['0x01'] },
      },
    });
  });

  it('cleanup clears session and account slices', async () => {
    const storeInstance = createStoreInstance({ persist: false });
    const runtime = createPopup({ metadata, preference, storeInstance });
    runtime.writeSession({
      scopes: {
        'eip155:8453': {
          accounts: ['eip155:8453:0xabcabcabcabcabcabcabcabcabcabcabcabcabca'],
          methods: [],
        },
      },
      selected: { eip155: 'eip155:8453:0xabcabcabcabcabcabcabcabcabcabcabcabcabca' },
      transportKind: 'popup',
    });
    await runtime.cleanup();
    expect(runtime.readSession()).toBeUndefined();
  });
});
