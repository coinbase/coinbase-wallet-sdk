import { Address } from ':core/type/index.js';
import { sessionFromAccounts } from './eip155.js';
import { invoke } from './invoke.js';
import type { Session, Transport } from './types.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;
const OTHER = '0x0000000000000000000000000000000000000001' as Address;
const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

describe('invoke', () => {
  it('qualifies then sends the envelope', async () => {
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

  it('rejects a chainId the session does not cover', async () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    const send = vi.fn();

    await expect(
      invoke(
        session,
        {
          chainId: SOLANA,
          request: { method: 'solana_signMessage', params: [] },
        },
        { kind: 'popup', send }
      )
    ).rejects.toThrow(/not in the session/);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects a covered non-eip155 namespace', async () => {
    const session: Session = {
      ...sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 }),
      scopes: {
        [SOLANA]: {
          accounts: [`${SOLANA}:So11111111111111111111111111111111111111112`],
          methods: ['solana_signMessage'],
        },
      },
    };
    const send = vi.fn();

    await expect(
      invoke(
        session,
        { chainId: SOLANA, request: { method: 'solana_signMessage', params: [] } },
        { kind: 'popup', send }
      )
    ).rejects.toThrow(/not enabled in this SDK version/);
    expect(send).not.toHaveBeenCalled();
  });
});
