import {
  WALLET_CREATE_SESSION,
  connectResultFromSession,
  createCaip25Request,
  parseCaip25Request,
  parseCaip25Result,
  sessionFromCaip25Result,
} from './caip25.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

describe('CAIP-25 request', () => {
  it('builds the private extensions on the eip155 namespace scope', () => {
    const request = createCaip25Request({
      chainId: 'eip155:8453',
      methods: ['personal_sign', 'wallet_connect'],
      requestParts: {
        capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x2105' } },
        params: [{ version: '1', optionalMetadata: 'preserved' }],
      },
      properties: { walletInfo: { name: 'generic session metadata' } },
    });

    expect(request).toEqual({
      method: WALLET_CREATE_SESSION,
      params: {
        scopes: {
          eip155: {
            chains: ['8453'],
            methods: ['personal_sign', 'wallet_connect'],
            notifications: ['accountsChanged', 'chainChanged'],
            capabilities: { signInWithEthereum: { nonce: 'n', chainId: '0x2105' } },
            params: [{ version: '1', optionalMetadata: 'preserved' }],
          },
        },
        properties: { walletInfo: { name: 'generic session metadata' } },
      },
    });
    expect(request.params.scopes.eip155?.params?.[0]).not.toHaveProperty('capabilities');
    expect(parseCaip25Request(request)).toEqual(request.params);
  });

  it('strictly validates private request extensions and eip155 scopes', () => {
    expect(() =>
      parseCaip25Request({
        method: WALLET_CREATE_SESSION,
        params: {
          scopes: {
            eip155: {
              chains: ['1'],
              methods: [],
              notifications: [],
              capabilities: [],
            },
          },
        },
      })
    ).toThrow(/capabilities must be an object/);
    expect(() =>
      parseCaip25Request({
        method: WALLET_CREATE_SESSION,
        params: {
          scopes: {
            eip155: {
              chains: ['1'],
              methods: [],
              notifications: [],
              params: [{ version: '1', capabilities: { duplicated: true } }],
            },
          },
        },
      })
    ).toThrow(/must be carried in the scope capabilities extension/);
    expect(() =>
      parseCaip25Request({
        method: WALLET_CREATE_SESSION,
        params: {
          scopes: {
            'solana:mainnet': { methods: [], notifications: [] },
          },
        },
      })
    ).toThrow(/eip155/);
  });
});

describe('CAIP-25 result', () => {
  const raw = {
    sessionId: 'session-1',
    scopes: {
      eip155: {
        chains: ['1', '8453'],
        accounts: [ADDRESS],
        methods: ['personal_sign'],
        notifications: ['accountsChanged'],
        capabilities: { signInWithEthereum: { message: 'm', signature: '0xsig' } },
      },
    },
    properties: { walletInfo: { name: 'Coinbase Wallet' } },
  };

  it('strictly parses raw accounts and expands exact chains to CAIP-10 state', () => {
    expect(parseCaip25Result(raw)).toEqual(raw);
    const session = sessionFromCaip25Result(raw, {
      preferredChainId: 'eip155:8453',
      transportKind: 'popup',
    });

    expect(session).toEqual({
      sessionId: 'session-1',
      scopes: {
        'eip155:1': {
          accounts: [`eip155:1:${ADDRESS}`],
          methods: ['personal_sign'],
          capabilities: raw.scopes.eip155.capabilities,
        },
        'eip155:8453': {
          accounts: [`eip155:8453:${ADDRESS}`],
          methods: ['personal_sign'],
          capabilities: raw.scopes.eip155.capabilities,
        },
      },
      selected: { eip155: `eip155:8453:${ADDRESS}` },
      transportKind: 'popup',
    });
    expect(connectResultFromSession(session, 'eip155:8453')).toEqual({
      accounts: [{ address: ADDRESS, capabilities: raw.scopes.eip155.capabilities }],
    });
  });

  it('rejects CAIP-10 response accounts and malformed grants', () => {
    expect(() =>
      parseCaip25Result({
        scopes: {
          'eip155:1': {
            accounts: [ADDRESS],
            methods: ['personal_sign'],
            notifications: [],
          },
        },
      })
    ).toThrow(/sessionId/);
    expect(() =>
      parseCaip25Result({
        sessionId: 'session-1',
        scopes: {
          'eip155:1': {
            accounts: [`eip155:1:${ADDRESS}`],
            methods: ['personal_sign'],
            notifications: [],
          },
        },
      })
    ).toThrow(/raw eip155 addresses/);
    expect(() =>
      parseCaip25Result({
        sessionId: 'session-1',
        scopes: {
          'eip155:1': {
            accounts: [ADDRESS],
            methods: 'personal_sign',
            notifications: [],
          },
        },
      })
    ).toThrow(/array of non-empty strings/);
    expect(() =>
      parseCaip25Result({
        sessionId: 'session-1',
        scopes: {
          eip155: {
            chains: ['1'],
            accounts: [ADDRESS],
            methods: ['personal_sign'],
            notifications: [],
            params: [{ version: '1' }],
          },
        },
      })
    ).toThrow(/params is not permitted/);
  });
});
