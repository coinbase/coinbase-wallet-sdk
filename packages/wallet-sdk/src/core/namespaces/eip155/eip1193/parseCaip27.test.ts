import { SOLANA_MAINNET } from ':core/namespaces/solana/caip.js';
import { WALLET_INVOKE_METHOD } from ':core/session/caip27.js';
import { parseCaip27 } from './parseCaip27.js';

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
          chainId: SOLANA_MAINNET,
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
