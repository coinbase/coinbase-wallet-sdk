import { SOLANA_MAINNET } from ':core/namespaces/solana/index.js';
import { sessionFromCaip25Result } from './caip25.js';
import { activeGrantForChain } from './grants.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const SOLANA_PUBLIC_KEY = 'So11111111111111111111111111111111111111112';

describe('sessionFromCaip25Result', () => {
  it('stores each namespace scope as that namespace grant, with raw accounts', () => {
    const capabilities = { signInWithEthereum: { message: 'm', signature: '0xsig' } };
    const session = sessionFromCaip25Result({
      sessionId: 'session-1',
      scopes: {
        eip155: {
          accounts: [ADDRESS],
          methods: ['personal_sign'],
          notifications: ['accountsChanged'],
          capabilities,
        },
        solana: {
          accounts: [SOLANA_PUBLIC_KEY],
          methods: ['solana_signMessage'],
          notifications: [],
        },
      },
      properties: { walletInfo: { name: 'Coinbase Wallet' } },
    });

    // Only the chain catalog is read out of `properties`; nothing else is kept.
    expect(session).toEqual({
      sessionId: 'session-1',
      namespaces: {
        eip155: { accounts: [ADDRESS], methods: ['personal_sign'], capabilities },
        solana: { accounts: [SOLANA_PUBLIC_KEY], methods: ['solana_signMessage'] },
      },
    });
    expect(activeGrantForChain(session, 'eip155:7777777')).toBeDefined();
    expect(activeGrantForChain(session, SOLANA_MAINNET)).toBeDefined();
  });

  it('parses the chain catalog once, dropping malformed fields but keeping the entry', () => {
    const session = sessionFromCaip25Result({
      sessionId: 'session-1',
      scopes: {},
      properties: {
        chainMetadata: {
          'eip155:8453': {
            rpcUrl: 'https://mainnet.base.org',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimal: 18 },
            capabilities: { atomic: { supported: true } },
          },
          'eip155:10': {
            rpcUrl: 'javascript:alert(1)',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimal: -1 },
            capabilities: 'not-an-object',
          },
          'eip155:1': 'not-an-object',
        },
      },
    });

    expect(session.chainMetadata).toEqual({
      'eip155:8453': {
        rpcUrl: 'https://mainnet.base.org',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimal: 18 },
        capabilities: { atomic: { supported: true } },
      },
      'eip155:10': {},
    });
  });

  it('ignores chain-keyed scopes', () => {
    const session = sessionFromCaip25Result({
      sessionId: 'session-1',
      scopes: {
        'eip155:8453': {
          accounts: [ADDRESS],
          methods: ['eth_sendTransaction'],
          notifications: [],
          capabilities: { atomic: { status: 'supported' } },
        },
        [SOLANA_MAINNET]: {
          accounts: [SOLANA_PUBLIC_KEY],
          methods: ['solana_signMessage'],
          notifications: [],
        },
      },
    });

    expect(session).toEqual({ sessionId: 'session-1', namespaces: {} });
  });

  it('ignores a chain list on a namespace scope and keeps the grant namespace-wide', () => {
    const session = sessionFromCaip25Result({
      sessionId: 'session-1',
      scopes: {
        eip155: {
          chains: ['8453', '10'],
          accounts: [ADDRESS],
          methods: ['eth_sendTransaction'],
          notifications: [],
        },
      },
    });

    expect(session.namespaces).toEqual({
      eip155: { accounts: [ADDRESS], methods: ['eth_sendTransaction'] },
    });
  });

  it("keeps each account's capability answers on the grant", () => {
    const session = sessionFromCaip25Result({
      sessionId: 'session-1',
      scopes: {
        eip155: {
          accounts: [ADDRESS],
          methods: ['personal_sign'],
          notifications: [],
          capabilities: { paymasterService: { supported: true } },
          accountCapabilities: { [ADDRESS]: { signInWithEthereum: { message: 'm' } } },
        },
      },
    });

    expect(session.namespaces.eip155).toEqual({
      accounts: [ADDRESS],
      methods: ['personal_sign'],
      capabilities: { paymasterService: { supported: true } },
      accountCapabilities: { [ADDRESS]: { signInWithEthereum: { message: 'm' } } },
    });
  });

  it('rejects capability answers for an account the scope did not grant', () => {
    expect(() =>
      sessionFromCaip25Result({
        sessionId: 'session-1',
        scopes: {
          eip155: {
            accounts: [ADDRESS],
            methods: [],
            notifications: [],
            accountCapabilities: { '0x0000000000000000000000000000000000000002': {} },
          },
        },
      })
    ).toThrow(/is not a granted account/);
    expect(() =>
      sessionFromCaip25Result({
        sessionId: 'session-1',
        scopes: {
          eip155: {
            accounts: [ADDRESS],
            methods: [],
            notifications: [],
            accountCapabilities: { [ADDRESS]: 'signed' },
          },
        },
      })
    ).toThrow(/must be an object/);
  });

  it('rejects a malformed result', () => {
    expect(() =>
      sessionFromCaip25Result({
        scopes: { eip155: { accounts: [ADDRESS], methods: [], notifications: [] } },
      })
    ).toThrow(/sessionId/);
    expect(() =>
      sessionFromCaip25Result({
        sessionId: 'session-1',
        scopes: {
          eip155: { accounts: [ADDRESS], methods: 'personal_sign', notifications: [] },
        },
      })
    ).toThrow(/array of non-empty strings/);
    expect(() =>
      sessionFromCaip25Result({ sessionId: 'session-1', scopes: { eip155: 'granted' } })
    ).toThrow(/must be an object/);
  });

  it('leaves account format to the namespace readers', () => {
    const session = sessionFromCaip25Result({
      sessionId: 'session-1',
      scopes: {
        solana: { accounts: ['0OIl-not-base58'], methods: [], notifications: [] },
      },
    });

    expect(session.namespaces.solana?.accounts).toEqual(['0OIl-not-base58']);
  });
});
