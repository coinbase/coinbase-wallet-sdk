import { projectEthAccounts } from ':core/namespaces/eip155/session.js';
import { sessionFromAccounts } from ':core/namespaces/eip155/session.fixtures.js';
import {
  activeGrantForChain,
  activeGrantForNamespace,
  activeSession,
  assertInvokeAuthorized,
  sessionCovers,
} from './grants.js';
import { sessionFromCaip25Result } from './caip25.js';
import type { Session } from './types.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;
const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
const SOLANA_PUBLIC_KEY = 'So11111111111111111111111111111111111111112';

describe('sessionCovers', () => {
  const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

  it('is false when there is no session', () => {
    expect(sessionCovers(undefined, ['eip155:1'])).toBe(false);
  });

  it('covers an empty requirement list vacuously', () => {
    // Nothing asks for a chain, so nothing is missing. Callers that mean "is this
    // session usable at all" use `activeSession`, which checks for accounts.
    const empty: Session = { namespaces: {} };
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    expect(sessionCovers(empty, [])).toBe(true);
    expect(sessionCovers(session, [])).toBe(true);
  });

  it('covers every eip155 chain and still checks granted methods', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    // The grant is namespace-wide, so a chain the app never declared is covered.
    expect(sessionCovers(session, ['eip155:8453'])).toBe(true);
    expect(sessionCovers(session, [{ chainId: 'eip155:1', methods: ['personal_sign'] }])).toBe(
      true
    );
    expect(sessionCovers(session, [{ chainId: 'eip155:1', methods: ['eth_subscribe'] }])).toBe(
      false
    );
  });

  it('requires a grant in the namespace the requirement names', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    // An eip155 grant says nothing about Solana, however wide it is.
    expect(sessionCovers(session, [SOLANA])).toBe(false);

    session.namespaces.solana = {
      accounts: [SOLANA_PUBLIC_KEY],
      methods: ['solana_signMessage'],
    };
    expect(sessionCovers(session, [SOLANA])).toBe(true);
  });
});

describe('activeSession', () => {
  it('requires a wallet-issued id and at least one authorized account', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });

    expect(activeSession(undefined)).toBeUndefined();
    expect(activeSession({ namespaces: {} })).toBeUndefined();
    expect(activeSession(session)).toBeUndefined();

    const active = { ...session, sessionId: 'session-1' };
    expect(activeSession(active)).toBe(active);
  });

  it('rejects a session whose grants have been emptied', () => {
    // An id alone is not a connection: the wallet can revoke every account and leave
    // the scope keys behind.
    const emptied = {
      sessionId: 'session-1',
      namespaces: { eip155: { accounts: [], methods: ['personal_sign'] } },
    };

    expect(activeSession(emptied)).toBeUndefined();
  });
});

/** What the wallet returns for an EVM connection: one namespace-wide grant. */
const namespaceSession: Session = {
  sessionId: 'session-1',
  namespaces: {
    eip155: {
      accounts: [ADDRESS],
      methods: ['eth_sendTransaction', 'personal_sign'],
    },
  },
};

const solanaSession: Session = {
  sessionId: 'session-1',
  namespaces: {
    solana: {
      accounts: [SOLANA_PUBLIC_KEY],
      methods: ['solana_signMessage'],
    },
  },
};

describe('activeGrantForChain', () => {
  it('resolves the namespace grant for every chain in that namespace', () => {
    expect(activeGrantForChain(namespaceSession, 'eip155:8453')).toBe(
      namespaceSession.namespaces.eip155
    );
    expect(activeGrantForChain(namespaceSession, 'eip155:10')).toBe(
      namespaceSession.namespaces.eip155
    );
    expect(activeGrantForChain(namespaceSession, 'eip155:42161')).toBe(
      namespaceSession.namespaces.eip155
    );
  });

  it('never crosses namespaces', () => {
    expect(activeGrantForChain(namespaceSession, SOLANA_MAINNET)).toBeUndefined();
    expect(activeGrantForChain(solanaSession, 'eip155:8453')).toBeUndefined();
    expect(activeGrantForNamespace(namespaceSession, 'solana')).toBeUndefined();
    expect(activeGrantForNamespace(solanaSession, 'eip155')).toBeUndefined();
  });

  it('ignores an empty grant', () => {
    const empty: Session = { namespaces: { eip155: { accounts: [], methods: ['personal_sign'] } } };
    expect(activeGrantForChain(empty, 'eip155:8453')).toBeUndefined();
    expect(activeGrantForNamespace(empty, 'eip155')).toBeUndefined();
  });

  it('resolves each namespace independently in a mixed session', () => {
    const mixed: Session = {
      sessionId: 'session-1',
      namespaces: {
        ...namespaceSession.namespaces,
        ...solanaSession.namespaces,
      },
    };
    expect(activeGrantForChain(mixed, 'eip155:10')?.methods).toEqual([
      'eth_sendTransaction',
      'personal_sign',
    ]);
    expect(activeGrantForChain(mixed, SOLANA_MAINNET)?.methods).toEqual(['solana_signMessage']);
  });
});

describe('grant accounts', () => {
  it('returns the same raw accounts on every chain in the namespace', () => {
    expect(activeGrantForChain(namespaceSession, 'eip155:8453')?.accounts).toEqual([ADDRESS]);
    expect(activeGrantForChain(namespaceSession, 'eip155:10')?.accounts).toEqual([ADDRESS]);
    expect(activeGrantForChain(solanaSession, SOLANA_MAINNET)?.accounts).toEqual([
      SOLANA_PUBLIC_KEY,
    ]);
    expect(activeGrantForChain(namespaceSession, SOLANA_MAINNET)?.accounts).toBeUndefined();
  });
});

describe('namespace grants through the kernel', () => {
  it('authorizes an invoke on a chain that was never enumerated', () => {
    expect(() =>
      assertInvokeAuthorized(namespaceSession, {
        chainId: 'eip155:10',
        request: { method: 'eth_sendTransaction', params: [] },
        sessionId: 'session-1',
      })
    ).not.toThrow();
  });

  it('leaves method support to the wallet rather than rejecting locally', () => {
    // The SDK requests the methods it knows about, so a method missing from the grant
    // means the wallet abbreviated its answer or the method is newer than the request.
    // Rejecting here would surface as 4100, which the provider treats as a disconnect.
    expect(() =>
      assertInvokeAuthorized(namespaceSession, {
        chainId: 'eip155:10',
        request: { method: 'wallet_sendCalls', params: [] },
        sessionId: 'session-1',
      })
    ).not.toThrow();
  });

  it('still rejects a chain in a namespace with no grant', () => {
    expect(() =>
      assertInvokeAuthorized(namespaceSession, {
        chainId: SOLANA_MAINNET,
        request: { method: 'solana_signMessage', params: [] },
        sessionId: 'session-1',
      })
    ).toThrow(/is not in the session/);
  });

  it('covers any chain requirement in the namespace', () => {
    expect(sessionCovers(namespaceSession, ['eip155:10'])).toBe(true);
    expect(
      sessionCovers(namespaceSession, [{ chainId: 'eip155:10', methods: ['personal_sign'] }])
    ).toBe(true);
    expect(
      sessionCovers(namespaceSession, [{ chainId: 'eip155:10', methods: ['wallet_sendCalls'] }])
    ).toBe(false);
    expect(sessionCovers(solanaSession, ['eip155:10'])).toBe(false);
  });

  it('projects the same accounts regardless of chain', () => {
    expect(projectEthAccounts(namespaceSession)).toEqual([ADDRESS]);
    expect(projectEthAccounts(solanaSession)).toEqual([]);
  });
});

describe('sessionFromCaip25Result', () => {
  it('stores a namespace scope as the namespace grant', () => {
    const session = sessionFromCaip25Result({
      sessionId: 'session-1',
      scopes: {
        eip155: {
          accounts: [ADDRESS],
          methods: ['eth_sendTransaction'],
          notifications: [],
        },
      },
    });

    expect(session.namespaces).toEqual({
      eip155: { accounts: [ADDRESS], methods: ['eth_sendTransaction'] },
    });
    expect(activeGrantForChain(session, 'eip155:7777777')).toBeDefined();
  });

  it('promotes a lone chain-keyed scope to its namespace grant', () => {
    // How an older wallet answers Solana pairing. Authorization is per namespace, so
    // the only chain it named becomes the grant for its whole namespace.
    const session = sessionFromCaip25Result({
      sessionId: 'session-1',
      scopes: {
        [SOLANA_MAINNET]: {
          accounts: [SOLANA_PUBLIC_KEY],
          methods: ['solana_signMessage'],
          notifications: [],
        },
      },
    });

    expect(Object.keys(session.namespaces)).toEqual(['solana']);
    expect(session.namespaces.solana.accounts).toEqual([SOLANA_PUBLIC_KEY]);
    expect(activeGrantForChain(session, SOLANA_MAINNET)).toBeDefined();
  });

  it('folds a chain scope into chain metadata when its namespace is already granted', () => {
    const session = sessionFromCaip25Result({
      sessionId: 'session-1',
      scopes: {
        eip155: {
          accounts: [ADDRESS],
          methods: ['eth_sendTransaction'],
          notifications: [],
        },
        'eip155:8453': {
          accounts: [],
          methods: ['wallet_sendCalls'],
          notifications: [],
          capabilities: { atomic: { status: 'supported' } },
        },
      },
    });

    // Only capabilities survive: the chain scope carries facts, not authorization.
    expect(session.namespaces).toEqual({
      eip155: { accounts: [ADDRESS], methods: ['eth_sendTransaction'] },
    });
    expect(session.properties).toEqual({
      chainMetadata: {
        'eip155:8453': { capabilities: { atomic: { status: 'supported' } } },
      },
    });
  });

  it('rejects a namespace scope that tries to narrow itself with chains', () => {
    expect(() =>
      sessionFromCaip25Result({
        sessionId: 'session-1',
        scopes: {
          eip155: {
            chains: ['8453', '10'],
            accounts: [ADDRESS],
            methods: ['eth_sendTransaction'],
            notifications: [],
          },
        },
      })
    ).toThrow(/cannot narrow a namespace grant/);
  });

  it('rejects a chains array on a chain-keyed scope', () => {
    expect(() =>
      sessionFromCaip25Result({
        sessionId: 'session-1',
        scopes: {
          'eip155:8453': {
            chains: ['8453'],
            accounts: [ADDRESS],
            methods: ['eth_sendTransaction'],
            notifications: [],
          },
        },
      })
    ).toThrow(/must not be present on a chain-keyed scope/);
  });
});
