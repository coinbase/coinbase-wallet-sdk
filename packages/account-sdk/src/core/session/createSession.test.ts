import { Address } from ':core/type/index.js';
import { createSession } from './createSession.js';
import { sessionFromAccounts } from './eip155.js';
import { invoke } from './invoke.js';
import type { Channel } from './types.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;

describe('createSession', () => {
  it('skips pair when eip155 is already covered', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    const pair = vi.fn();
    const result = await createSession({
      session,
      requiredScopes: ['eip155:8453'],
      pair,
    });
    expect(result.session).toBe(session);
    expect(pair).not.toHaveBeenCalled();
  });
});

describe('invoke', () => {
  it('localizes then sends', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    const send = vi.fn().mockResolvedValue('0xsig');
    const channel: Channel = { kind: 'popup', send };

    await invoke(
      session,
      { chainId: 'eip155:8453', method: 'personal_sign', params: ['0x68656c6c6f'] },
      channel
    );

    expect(send).toHaveBeenCalledWith(expect.objectContaining({ from: `eip155:8453:${ADDRESS}` }));
  });
});
