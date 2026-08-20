import { Address } from ':core/type/index.js';
import { sessionFromAccounts } from './eip155.js';
import { ensureSession } from './ensureSession.js';
import { invoke } from './invoke.js';
import type { Transport } from './types.js';

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
});

describe('invoke', () => {
  it('qualifies then sends', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    const send = vi.fn().mockResolvedValue('0xsig');
    const transport: Transport = { kind: 'popup', send };

    await invoke(
      session,
      { chainId: 'eip155:8453', method: 'personal_sign', params: ['0x68656c6c6f'] },
      transport
    );

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ from: `eip155:8453:${ADDRESS}` }));
  });
});
