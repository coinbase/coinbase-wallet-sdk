import {
  WALLET_INVOKE_METHOD,
  assertInvokeAuthorized,
  createCaip27Request,
  parseCaip27,
  parseCaip27Response,
  toCaip27,
  unwrapCaip27Response,
} from './caip27.js';
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
        params: [{ scope: 'eip155:1', request: { method: 'eth_accounts' } }],
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

  it('builds the wallet_invokeMethod wire request without changing popup runtime', () => {
    expect(
      createCaip27Request({
        sessionId: 'session-1',
        chainId: 'eip155:8453',
        request: { method: 'personal_sign' },
      })
    ).toEqual({
      method: WALLET_INVOKE_METHOD,
      params: {
        sessionId: 'session-1',
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: [] },
      },
    });
  });
});

describe('CAIP-27 responses', () => {
  const request = {
    sessionId: 'session-1',
    chainId: 'eip155:8453',
    request: { method: 'personal_sign', params: [] },
  } as const;

  it('validates and unwraps a successful response envelope', () => {
    const response = parseCaip27Response(
      {
        sessionId: 'session-1',
        chainId: 'eip155:8453',
        result: { method: 'personal_sign', result: '0xsig' },
      },
      request
    );

    expect(unwrapCaip27Response(response)).toBe('0xsig');
  });

  it('preserves a method-level error inside the response envelope', () => {
    const response = parseCaip27Response(
      {
        sessionId: 'session-1',
        chainId: 'eip155:8453',
        error: { code: 4100, message: 'not authorized', data: { reason: 'method' } },
      },
      request
    );

    expect(() => unwrapCaip27Response(response)).toThrow();
    try {
      unwrapCaip27Response(response);
    } catch (error) {
      expect(error).toEqual({
        code: 4100,
        message: 'not authorized',
        data: { reason: 'method' },
      });
    }
  });

  it('rejects mismatched targeting and malformed envelopes', () => {
    expect(() =>
      parseCaip27Response(
        {
          sessionId: 'wrong',
          chainId: 'eip155:8453',
          result: { method: 'personal_sign', result: '0xsig' },
        },
        request
      )
    ).toThrow(/sessionId/);
    expect(() =>
      parseCaip27Response(
        {
          sessionId: 'session-1',
          chainId: 'eip155:1',
          result: { method: 'personal_sign', result: '0xsig' },
        },
        request
      )
    ).toThrow(/chainId/);
    expect(() =>
      parseCaip27Response(
        {
          sessionId: 'session-1',
          chainId: 'eip155:8453',
          result: { method: 'eth_sendTransaction', result: '0xsig' },
        },
        request
      )
    ).toThrow(/requested method/);
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
