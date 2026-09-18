import { sessionFromAccounts } from ':core/namespaces/eip155/session.js';
import { sessionFromSolanaAccounts } from ':core/namespaces/solana/session.js';
import { send } from ':core/transport/popup/send.js';
import { bindStore, createStoreInstance } from ':store/store.js';
import type { OpenerFn } from ':util/web.js';
import { createPopupTransport } from './createPopupTransport.js';

const { mockCommunicatorConstructor } = vi.hoisted(() => ({
  mockCommunicatorConstructor: vi.fn(),
}));

vi.mock(':core/transport/popup/Communicator.js', () => ({
  Communicator: class {
    constructor(options: unknown) {
      mockCommunicatorConstructor(options);
    }
    postRequestAndWaitForResponse = vi.fn();
    waitForPopupLoaded = vi.fn();
  },
}));

vi.mock(':core/transport/popup/handshake.js', () => ({
  handshake: vi.fn().mockResolvedValue({ result: { value: null } }),
}));

vi.mock(':core/transport/popup/send.js', () => ({
  send: vi.fn().mockResolvedValue({ result: { value: '0xok' } }),
}));

const metadata = { appName: 'Test', appLogoUrl: null, appChainIds: [8453] };
const preference = { telemetry: false };
const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const SOLANA_PUBLIC_KEY = 'So11111111111111111111111111111111111111112';

function createTestTransport(openerFn?: OpenerFn) {
  const store = bindStore(createStoreInstance({ persist: false }));
  return createPopupTransport({
    metadata,
    preference,
    openerFn,
    keys: store.keys,
    session: store.session,
  });
}

describe('createPopupTransport', () => {
  it('constructs without opening the popup', () => {
    const transport = createTestTransport();

    expect(transport).not.toHaveProperty('store');
    expect(transport.readSession()).toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });

  it('passes the custom opener to the communicator', () => {
    const openerFn: OpenerFn = vi.fn();

    createTestTransport(openerFn);

    expect(mockCommunicatorConstructor).toHaveBeenCalledWith(expect.objectContaining({ openerFn }));
  });

  it('reads and writes session state without applying authorization policy', () => {
    const transport = createTestTransport();
    const sessions: Parameters<typeof transport.writeSession>[0][] = [
      { scopes: {} },
      sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 }),
      sessionFromSolanaAccounts({ accounts: [SOLANA_PUBLIC_KEY] }),
    ];

    for (const session of sessions) {
      transport.writeSession(session);
      expect(transport.readSession()).toBe(session);
    }
  });

  it('forwards complete requests', async () => {
    const transport = createTestTransport();
    const request = {
      method: 'wallet_invokeMethod',
      params: {
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: ['0x01'] },
      },
    };

    await expect(transport.request(request)).resolves.toBe('0xok');

    expect(send).toHaveBeenCalledWith(expect.anything(), request, undefined);
  });

  it('clears pairing keys and session state in one cleanup', async () => {
    const store = bindStore(createStoreInstance({ persist: false }));
    const transport = createPopupTransport({
      metadata,
      preference,
      keys: store.keys,
      session: store.session,
    });
    store.keys.set('ownPrivateKey', 'stale-key-material');
    transport.writeSession({
      ...sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 }),
      sessionId: 'session-1',
    });

    await transport.cleanup();

    // Disconnect is atomic: leaving ECDH material behind would keep the pairing usable.
    expect(store.keys.get('ownPrivateKey')).toBeUndefined();
    expect(transport.readSession()).toBeUndefined();
  });

  it('clears session state', async () => {
    const transport = createTestTransport();
    transport.writeSession({
      ...sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 }),
      sessionId: 'session-1',
    });

    await transport.cleanup();

    expect(transport.readSession()).toBeUndefined();
  });
});
