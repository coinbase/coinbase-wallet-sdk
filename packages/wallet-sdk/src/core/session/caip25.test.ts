import { SOLANA_NAMESPACE } from ':core/namespaces/solana/caip.js';
import { SOLANA_MAINNET, createSolanaMainnetScopes } from ':core/namespaces/solana/index.js';
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
          [SOLANA_NAMESPACE]: {
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
    const params = parseCaip25Request(request);
    expect(params.scopes[SOLANA_NAMESPACE]).not.toHaveProperty('params');
    expect(params.scopes[SOLANA_NAMESPACE]).not.toHaveProperty('capabilities');
    expect(params).toEqual(request.params);
  });

  it('strictly validates generic scopes and private request extension shapes', () => {
    expect(() =>
      parseCaip25Request({
        method: WALLET_CREATE_SESSION,
        params: {
          scopes: {
            'eip155:1': {
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
            'eip155:1': {
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
            'not a scope': { methods: [], notifications: [] },
          },
        },
      })
    ).toThrow(/CAIP-2 chain id or a CAIP namespace/);
    // A bare namespace with no chains is the SDK's own request shape and must parse.
    expect(
      parseCaip25Request({
        method: WALLET_CREATE_SESSION,
        params: {
          scopes: {
            eip155: { methods: [], notifications: [] },
          },
        },
      })
    ).toMatchObject({ scopes: { eip155: { methods: [], notifications: [] } } });
    expect(() =>
      parseCaip25Request({
        method: WALLET_CREATE_SESSION,
        params: {
          scopes: {
            'eip155:8453': { chains: ['8453'], methods: [], notifications: [] },
          },
        },
      })
    ).toThrow(/must not be present on a chain-keyed scope/);
    expect(
      parseCaip25Request({
        method: WALLET_CREATE_SESSION,
        params: {
          scopes: {
            [SOLANA_MAINNET]: {
              methods: [],
              notifications: [],
              capabilities: { evmOnly: true },
            },
          },
        },
      })
    ).toMatchObject({
      scopes: {
        [SOLANA_MAINNET]: {
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
        accounts: [ADDRESS],
        methods: ['personal_sign'],
        notifications: ['accountsChanged'],
        capabilities: { signInWithEthereum: { message: 'm', signature: '0xsig' } },
      },
    },
    properties: { walletInfo: { name: 'Coinbase Wallet' } },
  };

  it('keeps the wallet grant verbatim, with raw accounts', () => {
    expect(parseCaip25Result(raw)).toEqual(raw);
    const session = sessionFromCaip25Result(raw);

    expect(session).toEqual({
      sessionId: 'session-1',
      namespaces: {
        eip155: {
          accounts: [ADDRESS],
          methods: ['personal_sign'],
          capabilities: raw.scopes.eip155.capabilities,
        },
      },
      properties: raw.properties,
    });
  });

  it('keeps mixed namespaces separate without synthesizing selection', () => {
    // The Solana side arrives chain-keyed here: a namespace with no namespace grant
    // takes its lone chain scope as the grant, which is how an older wallet answers.
    const mixed = {
      sessionId: 'session-mixed',
      scopes: {
        eip155: {
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
      namespaces: {
        eip155: {
          accounts: [ADDRESS],
          methods: ['personal_sign'],
        },
        solana: {
          accounts: [SOLANA_PUBLIC_KEY],
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
    ).toThrow(/raw account addresses/);
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
          'eip155:1': {
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
          [SOLANA_MAINNET]: {
            accounts: ['0OIl-not-base58'],
            methods: ['solana_signMessage'],
            notifications: [],
          },
        },
      })
    ).toMatchObject({
      scopes: {
        [SOLANA_MAINNET]: {
          accounts: ['0OIl-not-base58'],
        },
      },
    });
  });
});
