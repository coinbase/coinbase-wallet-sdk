import { Address } from ':core/type/index.js';
import { sessionFromAccounts } from './eip155.js';
import { ensureSession } from './ensureSession.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;

describe('ensureSession', () => {
  it('skips pair when eip155 is already covered', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    const pair = vi.fn();
    const result = await ensureSession({
      session,
      requiredScopes: ['eip155:8453'],
      pair,
    });
    expect(result.session).toBe(session);
    expect(pair).not.toHaveBeenCalled();
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
