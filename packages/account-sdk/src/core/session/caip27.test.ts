import { sessionFromAccounts } from ':core/namespaces/eip155/session.js';
import { SOLANA_MAINNET } from ':core/namespaces/solana/caip.js';
import {
  WALLET_INVOKE_METHOD,
  assertInvokeAuthorized,
  createCaip27Request,
  parseCaip27Response,
  toCaip27,
  unwrapCaip27Response,
} from './caip27.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

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

  it('validates a Solana response against its exact CAIP-2 envelope', () => {
    const solanaRequest = {
      sessionId: 'solana-session',
      chainId: SOLANA_MAINNET,
      request: { method: 'solana_signMessage', params: [{ message: 'aGVsbG8=' }] },
    } as const;
    const response = parseCaip27Response(
      {
        sessionId: 'solana-session',
        chainId: SOLANA_MAINNET,
        result: { method: 'solana_signMessage', result: { signature: 'AQ==' } },
      },
      solanaRequest
    );

    expect(unwrapCaip27Response(response)).toEqual({ signature: 'AQ==' });
    expect(() =>
      parseCaip27Response(
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
    expect(() =>
      parseCaip27Response(
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
  });
});

describe('assertInvokeAuthorized', () => {
  it('requires an exact chain, granted method, and matching session id', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    session.sessionId = 'session-1';

    expect(() =>
      assertInvokeAuthorized(session, {
        sessionId: 'session-1',
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: [] },
      })
    ).not.toThrow();
    expect(() =>
      assertInvokeAuthorized(session, {
        chainId: 'eip155:1',
        request: { method: 'personal_sign', params: [] },
      })
    ).toThrow(/not in the session/);
    expect(() =>
      assertInvokeAuthorized(session, {
        chainId: 'eip155:8453',
        request: { method: 'eth_subscribe', params: [] },
      })
    ).toThrow(/not authorized/);
    expect(() =>
      assertInvokeAuthorized(session, {
        sessionId: 'wrong',
        chainId: 'eip155:8453',
        request: { method: 'personal_sign', params: [] },
      })
    ).toThrow(/sessionId/);
  });
});
