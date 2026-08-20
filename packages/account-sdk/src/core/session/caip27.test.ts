import { WALLET_INVOKE_METHOD, assertInvokeAuthorized, parseCaip27, toCaip27 } from './caip27.js';
import { sessionFromAccounts } from './eip155.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

describe('parseCaip27', () => {
  it('parses named CAIP-27 params', () => {
    expect(
      parseCaip27({
        method: WALLET_INVOKE_METHOD,
        params: {
          chainId: 'eip155:8453',
          request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
          capabilities: { atomic: { status: 'supported' } },
        },
      })
    ).toEqual({
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
      capabilities: { atomic: { status: 'supported' } },
    });
  });

  it('accepts MetaMask scope and array params', () => {
    expect(
      parseCaip27({
        method: WALLET_INVOKE_METHOD,
        params: [{ scope: 'eip155:1', request: { method: 'eth_accounts', params: [] } }],
      })
    ).toEqual({
      chainId: 'eip155:1',
      request: { method: 'eth_accounts', params: [] },
    });
  });

  it('rejects nested wallet_invokeMethod and a missing chainId', () => {
    expect(() =>
      parseCaip27({
        method: WALLET_INVOKE_METHOD,
        params: { chainId: 'eip155:1', request: { method: WALLET_INVOKE_METHOD } },
      })
    ).toThrow();
    expect(() =>
      parseCaip27({
        method: WALLET_INVOKE_METHOD,
        params: { request: { method: 'personal_sign' } },
      })
    ).toThrow();
  });
});

describe('toCaip27', () => {
  it('copies CAIP-27 params', () => {
    expect(
      toCaip27({
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: [] },
        capabilities: { atomic: { status: 'supported' } },
      })
    ).toEqual({
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: [] },
      capabilities: { atomic: { status: 'supported' } },
    });
  });
});

describe('assertInvokeAuthorized', () => {
  it('allows eip155 chain-agnostic coverage', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    expect(() =>
      assertInvokeAuthorized(session, {
        chainId: 'eip155:1',
        request: { method: 'personal_sign', params: [] },
      })
    ).not.toThrow();
  });

  it('rejects an uncovered namespace', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    expect(() =>
      assertInvokeAuthorized(session, {
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        request: { method: 'solana_signMessage', params: [] },
      })
    ).toThrow(/not in the session/);
  });
});
