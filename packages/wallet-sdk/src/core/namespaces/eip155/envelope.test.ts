import { qualify, toEnvelope } from './envelope.js';
import { sessionFromAccounts } from './session.fixtures.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const OTHER = '0x0000000000000000000000000000000000000001' as const;

describe('eip155 envelope', () => {
  const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });

  it('wraps EIP-1193 as a CAIP-27 envelope', () => {
    const envelope = toEnvelope(
      { method: 'personal_sign', params: ['0x68656c6c6f', ADDRESS] },
      8453
    );

    expect(envelope).toEqual({
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x68656c6c6f', ADDRESS] },
    });
  });

  it('qualify accepts signer-less methods when the target scope has an account', () => {
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

  it.each([
    ['eth_sign', { method: 'eth_sign', params: [ADDRESS, '0x68656c6c6f'] }],
    [
      'wallet_sign',
      {
        method: 'wallet_sign',
        params: [{ address: ADDRESS, version: '1.0', data: {} }],
      },
    ],
  ])('qualify accepts the authorized account for %s', (_name, request) => {
    expect(
      qualify(session, {
        chainId: 'eip155:8453',
        request,
      })
    ).toEqual({
      chainId: 'eip155:8453',
      request,
    });
  });

  it.each([
    ['eth_sign', { method: 'eth_sign', params: [OTHER, '0x68656c6c6f'] }],
    [
      'wallet_sign',
      {
        method: 'wallet_sign',
        params: [{ address: OTHER, version: '1.0', data: {} }],
      },
    ],
  ])('qualify rejects a mismatched account for %s', (_name, request) => {
    expect(() =>
      qualify(session, {
        chainId: 'eip155:8453',
        request,
      })
    ).toThrow(/not granted on the target chain/);
  });

  it('qualify rejects a from that is not in the session', () => {
    expect(() =>
      qualify(session, {
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: ['0x68656c6c6f', OTHER] },
      })
    ).toThrow(/not granted on the target chain/);
  });

  it('authorizes the same account on an EVM chain the session never enumerated', () => {
    expect(
      qualify(session, {
        chainId: 'eip155:1',
        request: { method: 'personal_sign', params: ['0x68656c6c6f', ADDRESS] },
      })
    ).toEqual({
      chainId: 'eip155:1',
      request: { method: 'personal_sign', params: ['0x68656c6c6f', ADDRESS] },
    });
  });

  it('rejects a chain when the session has no eip155 grant at all', () => {
    expect(() =>
      qualify(
        { namespaces: {} },
        {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: ['0x68656c6c6f', ADDRESS] },
        }
      )
    ).toThrow(/No eip155 account granted for target chain/);
  });
});
