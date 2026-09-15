import { sessionFromAccounts } from ':core/namespaces/eip155/session.js';
import { Address } from ':core/type/index.js';
import { ensureSession } from './ensureSession.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;

describe('ensureSession', () => {
  it('skips creation only when the exact chain and method are covered', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    const createSession = vi.fn();
    const result = await ensureSession({
      session,
      requiredScopes: [{ chainId: 'eip155:1', methods: ['personal_sign'] }],
      createSession,
    });
    expect(result).toBe(session);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('creates when an exact method is not granted', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    const createSession = vi.fn().mockResolvedValue(session);
    await ensureSession({
      session,
      requiredScopes: [{ chainId: 'eip155:1', methods: ['eth_subscribe'] }],
      createSession,
    });
    expect(createSession).toHaveBeenCalledTimes(1);
  });

  it('creates when there is no session', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    const createSession = vi.fn().mockResolvedValue(session);
    const result = await ensureSession({
      session: undefined,
      requiredScopes: ['eip155:1'],
      createSession,
    });
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(result).toBe(session);
  });
});
