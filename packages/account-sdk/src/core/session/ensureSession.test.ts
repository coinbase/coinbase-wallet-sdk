import { Address } from ':core/type/index.js';
import { sessionFromAccounts } from './eip155.js';
import { ensureSession } from './ensureSession.js';
import { invoke } from './invoke.js';
import type { Transport } from './types.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;
const OTHER = '0x0000000000000000000000000000000000000001' as Address;

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
      {
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
      },
      transport
    );

    expect(send).toHaveBeenCalledWith({
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
    });
  });

  it('rejects a from that is not in the session', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    const send = vi.fn();
    const transport: Transport = { kind: 'popup', send };

    await expect(
      invoke(
        session,
        {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: ['0x68656c6c6f', OTHER] },
        },
        transport
      )
    ).rejects.toThrow(/not in the eip155 session/);
    expect(send).not.toHaveBeenCalled();
  });
});
