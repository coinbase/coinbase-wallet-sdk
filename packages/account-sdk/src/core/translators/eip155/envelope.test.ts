import { sessionFromAccounts } from '../../session/eip155.js';
import { qualify, toEnvelope, toLegacyRequest } from './envelope.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const OTHER = '0x0000000000000000000000000000000000000001' as const;

describe('eip155 envelope', () => {
  const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });

  it('wraps EIP-1193 as CAIP-27 and unwraps for keys v1', () => {
    const envelope = toEnvelope(
      { method: 'personal_sign', params: ['0x68656c6c6f', ADDRESS] },
      8453
    );

    expect(envelope).toEqual({
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x68656c6c6f', ADDRESS] },
    });
    expect(toLegacyRequest(envelope)).toEqual({
      method: 'personal_sign',
      params: ['0x68656c6c6f', ADDRESS],
    });
  });

  it('qualify accepts the selected account when params omit from', () => {
    expect(
      qualify(session, {
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
      })
    ).toEqual({
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
    });
  });

  it('qualify rejects a from that is not in the session', () => {
    expect(() =>
      qualify(session, {
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: ['0x68656c6c6f', OTHER] },
      })
    ).toThrow(/not in the eip155 session/);
  });
});
