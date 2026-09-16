import {
  SOLANA_MAINNET,
  SOLANA_MAINNET_REFERENCE,
  createSolanaMainnetScopes,
} from ':core/namespaces/solana/index.js';
import {
  WALLET_CREATE_SESSION,
  createCaip25Request,
  parseCaip25Request,
  parseCaip25Result,
  sessionFromCaip25Result,
} from './caip25.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const SOLANA_PUBLIC_KEY = 'So11111111111111111111111111111111111111112';

describe('CAIP-25 request', () => {
  it('builds a Solana namespace scope without EVM private extensions', () => {
    const request = createCaip25Request({
      scopes: createSolanaMainnetScopes(),
      properties: { source: 'wallet-standard' },
    });

    expect(request).toEqual({
      method: WALLET_CREATE_SESSION,
      params: {
        scopes: {
          solana: {
            chains: [SOLANA_MAINNET_REFERENCE],
            methods: [
              'solana_signMessage',
              'solana_signTransaction',
              'solana_signAndSendTransaction',
              'solana_signAndSendAllTransactions',
            ],
            notifications: [],
          },
        },
        properties: { source: 'wallet-standard' },
      },
    });
    expect(request.params.scopes.solana).not.toHaveProperty('params');
    expect(request.params.scopes.solana).not.toHaveProperty('capabilities');
    expect(parseCaip25Request(request)).toEqual(request.params);
  });

  it('strictly validates generic scopes and private request extension shapes', () => {
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
            'not a scope': { chains: ['mainnet'], methods: [], notifications: [] },
          },
        },
      })
    ).toThrow(/valid CAIP namespace/);
    expect(
      parseCaip25Request({
        method: WALLET_CREATE_SESSION,
        params: {
          scopes: {
            solana: {
              chains: [SOLANA_MAINNET_REFERENCE],
              methods: [],
              notifications: [],
              capabilities: { evmOnly: true },
            },
          },
        },
      })
    ).toMatchObject({
      scopes: {
        solana: {
          capabilities: { evmOnly: true },
        },
      },
    });
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
    const session = sessionFromCaip25Result(raw);

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
      properties: raw.properties,
    });
  });

  it('expands mixed namespace account lists without synthesizing selection', () => {
    const mixed = {
      sessionId: 'session-mixed',
      scopes: {
        'eip155:1': {
          accounts: [ADDRESS],
          methods: ['personal_sign'],
          notifications: [],
        },
        [SOLANA_MAINNET]: {
          accounts: [SOLANA_PUBLIC_KEY],
          methods: ['solana_signMessage'],
          notifications: [],
          capabilities: { messageSigning: true },
        },
      },
    };

    expect(parseCaip25Result(mixed)).toEqual(mixed);
    expect(sessionFromCaip25Result(mixed)).toEqual({
      sessionId: 'session-mixed',
      scopes: {
        'eip155:1': {
          accounts: [`eip155:1:${ADDRESS}`],
          methods: ['personal_sign'],
        },
        [SOLANA_MAINNET]: {
          accounts: [`${SOLANA_MAINNET}:${SOLANA_PUBLIC_KEY}`],
          methods: ['solana_signMessage'],
          capabilities: { messageSigning: true },
        },
      },
    });
  });

  it('validates generic result shape without applying namespace account policy', () => {
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
    ).toThrow(/raw CAIP account addresses/);
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
    expect(
      parseCaip25Result({
        sessionId: 'session-1',
        scopes: {
          solana: {
            chains: [SOLANA_MAINNET_REFERENCE],
            accounts: ['0OIl-not-base58'],
            methods: ['solana_signMessage'],
            notifications: [],
          },
        },
      })
    ).toMatchObject({
      scopes: {
        solana: {
          accounts: ['0OIl-not-base58'],
        },
      },
    });
  });
});
