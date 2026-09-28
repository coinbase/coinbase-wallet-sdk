import { sessionFromAccounts } from ':core/namespaces/eip155/session.fixtures.js';
import { SOLANA_MAINNET } from ':core/namespaces/solana/caip.js';
import { WALLET_INVOKE_METHOD, createCaip27Request, readCaip27Result } from './caip27.js';
import { assertInvokeAuthorized } from './grants.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

describe('createCaip27Request', () => {
  it('copies CAIP-27 params onto the wire request', () => {
    expect(
      createCaip27Request({
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: [] },
        capabilities: { atomic: { status: 'supported' } },
      }).params
    ).toEqual({
      chainId: 'eip155:8453',
      request: { method: 'personal_sign', params: [] },
      capabilities: { atomic: { status: 'supported' } },
    });
  });

  it('builds the wallet_invokeMethod wire request', () => {
    expect(
      createCaip27Request({
        sessionId: 'session-1',
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: [] },
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
    expect(
      readCaip27Result(
        {
          sessionId: 'session-1',
          chainId: 'eip155:8453',
          result: { method: 'personal_sign', result: '0xsig' },
        },
        request
      )
    ).toBe('0xsig');
  });

  it('validates a Solana response against its exact CAIP-2 envelope', () => {
    const solanaRequest = {
      sessionId: 'solana-session',
      chainId: SOLANA_MAINNET,
      request: { method: 'solana_signMessage', params: [{ message: 'aGVsbG8=' }] },
    } as const;

    expect(
      readCaip27Result(
        {
          sessionId: 'solana-session',
          chainId: SOLANA_MAINNET,
          result: { method: 'solana_signMessage', result: { signature: 'AQ==' } },
        },
        solanaRequest
      )
    ).toEqual({ signature: 'AQ==' });
    expect(() =>
      readCaip27Result(
        {
          sessionId: 'solana-session',
          chainId: 'solana:devnet',
          result: { method: 'solana_signMessage', result: { signature: 'AQ==' } },
        },
        solanaRequest
      )
    ).toThrow(/chainId/);
  });

  it('throws a method-level error inside the response envelope', () => {
    const reply = {
      sessionId: 'session-1',
      chainId: 'eip155:8453',
      error: { code: 4100, message: 'not authorized', data: { reason: 'method' } },
    };

    expect(() => readCaip27Result(reply, request)).toThrow();
    try {
      readCaip27Result(reply, request);
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
      readCaip27Result(
        {
          sessionId: 'wrong',
          chainId: 'eip155:8453',
          result: { method: 'personal_sign', result: '0xsig' },
        },
        request
      )
    ).toThrow(/sessionId/);
    expect(() =>
      readCaip27Result(
        {
          sessionId: 'session-1',
          chainId: 'eip155:1',
          result: { method: 'personal_sign', result: '0xsig' },
        },
        request
      )
    ).toThrow(/chainId/);
    expect(() =>
      readCaip27Result(
        {
          sessionId: 'session-1',
          chainId: 'eip155:8453',
          result: { method: 'eth_sendTransaction', result: '0xsig' },
        },
        request
      )
    ).toThrow(/requested method/);
    expect(() =>
      readCaip27Result(
        {
          sessionId: 'session-1',
          chainId: 'invalid',
          result: { method: 'personal_sign', result: '0xsig' },
        },
        {
          ...request,
          chainId: 'invalid' as never,
        }
      )
    ).toThrow(/chainId/);
    expect(() =>
      readCaip27Result(
        {
          sessionId: 'session-1',
          chainId: 'eip155:8453',
          result: { method: 'personal_sign', result: '0xsig' },
          error: { code: 4100, message: 'not authorized' },
        },
        request
      )
    ).toThrow(/exactly one of result or error/);
  });
});

describe('assertInvokeAuthorized', () => {
  it('requires an authorized namespace and a matching session id', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    session.sessionId = 'session-1';

    expect(() =>
      assertInvokeAuthorized(session, {
        sessionId: 'session-1',
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: [] },
      })
    ).not.toThrow();
    // Any EVM chain is authorized by the same grant, declared or not.
    expect(() =>
      assertInvokeAuthorized(session, {
        chainId: 'eip155:1',
        request: { method: 'personal_sign', params: [] },
      })
    ).not.toThrow();
    expect(() =>
      assertInvokeAuthorized(session, {
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        request: { method: 'personal_sign', params: [] },
      })
    ).toThrow(/not in the session/);
    // Method support is the wallet's answer to give, not ours to guess from a
    // possibly-abbreviated grant list.
    expect(() =>
      assertInvokeAuthorized(session, {
        chainId: 'eip155:8453',
        request: { method: 'eth_subscribe', params: [] },
      })
    ).not.toThrow();
    expect(() =>
      assertInvokeAuthorized(session, {
        sessionId: 'wrong',
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: [] },
      })
    ).toThrow(/sessionId/);
  });
});
