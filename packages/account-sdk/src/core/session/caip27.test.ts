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
  it('strictly parses named eip155 CAIP-27 params', () => {
    expect(
      parseCaip27({
        method: WALLET_INVOKE_METHOD,
        params: {
          chainId: 'eip155:8453',
          sessionId: 'session-1',
          request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
          capabilities: { atomic: { status: 'supported' } },
        },
      })
    ).toEqual({
      chainId: 'eip155:8453',
      sessionId: 'session-1',
      request: { method: 'personal_sign', params: ['0x68656c6c6f'] },
      capabilities: { atomic: { status: 'supported' } },
    });
  });

  it('rejects aliases, array params, non-eip155 chains, and missing inner params', () => {
    expect(() =>
      parseCaip27({
        method: WALLET_INVOKE_METHOD,
        params: [{ chainId: 'eip155:1', request: { method: 'personal_sign', params: [] } }],
      })
    ).toThrow();
    expect(() =>
      parseCaip27({
        method: WALLET_INVOKE_METHOD,
        params: { scope: 'eip155:1', request: { method: 'personal_sign', params: [] } },
      })
    ).toThrow();
    expect(() =>
      parseCaip27({
        method: WALLET_INVOKE_METHOD,
        params: {
          chainId: 'solana:mainnet',
          request: { method: 'solana_signMessage', params: [] },
        },
      })
    ).toThrow();
    expect(() =>
      parseCaip27({
        method: WALLET_INVOKE_METHOD,
        params: { chainId: 'eip155:1', request: { method: 'personal_sign' } },
      })
    ).toThrow();
    expect(() =>
      parseCaip27({
        method: WALLET_INVOKE_METHOD,
        params: {
          chainId: 'eip155:1',
          request: { method: 'wallet_createSession', params: {} },
        },
      })
    ).toThrow(/nested CAIP carrier/);
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
