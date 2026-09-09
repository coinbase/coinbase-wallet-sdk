import { Address } from ':core/type/index.js';
import { sessionFromAccounts } from '../namespaces/eip155/session.js';
import { ensureSession } from './ensureSession.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;

describe('ensureSession', () => {
  it('skips pair only when the exact chain and method are covered', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    const pair = vi.fn();
    const result = await ensureSession({
      session,
      requiredScopes: [{ chainId: 'eip155:1', methods: ['personal_sign'] }],
      pair,
    });
    expect(result.session).toBe(session);
    expect(pair).not.toHaveBeenCalled();
  });

  it('pairs when an exact method is not granted', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    const pair = vi.fn().mockResolvedValue({ session });
    await ensureSession({
      session,
      requiredScopes: [{ chainId: 'eip155:1', methods: ['eth_subscribe'] }],
      pair,
    });
    expect(pair).toHaveBeenCalledTimes(1);
  });

  it('pairs when there is no session', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    const pair = vi.fn().mockResolvedValue({ session, result: { accounts: [] } });
    const result = await ensureSession({
      session: undefined,
      requiredScopes: ['eip155:1'],
      pair,
    });
    expect(pair).toHaveBeenCalledTimes(1);
    expect(result.session).toBe(session);
  });
});
