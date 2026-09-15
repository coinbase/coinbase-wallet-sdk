import { projectEthAccounts, projectEthAccountsForChain } from ':core/namespaces/eip155/session.js';
import { assertInvokeAuthorized } from './caip27.js';
import { sessionCovers } from './covers.js';
import { accountsFor, grantFor, hasNamespaceGrant, scopeNamespace } from './grants.js';
import { sessionFromCaip25Result } from './caip25.js';
import type { Session } from './types.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as const;

/** What a wallet returns when it grants the whole eip155 namespace. */
const namespaceSession: Session = {
  sessionId: 'session-1',
  scopes: {
    eip155: {
      accounts: [ADDRESS],
      methods: ['eth_sendTransaction', 'personal_sign'],
    },
  },
};

const chainSession: Session = {
  sessionId: 'session-1',
  scopes: {
    'eip155:8453': {
      accounts: [`eip155:8453:${ADDRESS}`],
      methods: ['eth_sendTransaction'],
    },
  },
};

describe('grantFor', () => {
  it('resolves a namespace grant for any chain in that namespace', () => {
    expect(grantFor(namespaceSession, 'eip155:8453')).toBe(namespaceSession.scopes.eip155);
    expect(grantFor(namespaceSession, 'eip155:10')).toBe(namespaceSession.scopes.eip155);
    expect(grantFor(namespaceSession, 'eip155:42161')).toBe(namespaceSession.scopes.eip155);
  });

  it('keeps a chain-keyed grant narrow', () => {
    expect(grantFor(chainSession, 'eip155:8453')).toBe(chainSession.scopes['eip155:8453']);
    expect(grantFor(chainSession, 'eip155:10')).toBeUndefined();
  });

  it('never crosses namespaces', () => {
    expect(grantFor(namespaceSession, 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBeUndefined();
  });

  it('ignores an empty grant', () => {
    const empty: Session = { scopes: { eip155: { accounts: [], methods: ['personal_sign'] } } };
    expect(grantFor(empty, 'eip155:8453')).toBeUndefined();
    expect(hasNamespaceGrant(empty, 'eip155')).toBe(false);
  });

  it('prefers an exact chain grant over the namespace grant', () => {
    const both: Session = {
      scopes: {
        eip155: { accounts: [ADDRESS], methods: ['personal_sign'] },
        'eip155:8453': { accounts: [`eip155:8453:${ADDRESS}`], methods: ['eth_sendTransaction'] },
      },
    };
    expect(grantFor(both, 'eip155:8453')?.methods).toEqual(['eth_sendTransaction']);
    expect(grantFor(both, 'eip155:10')?.methods).toEqual(['personal_sign']);
  });
});

describe('accountsFor', () => {
  it('normalizes CAIP-10 and raw accounts to the same list', () => {
    expect(accountsFor(chainSession, 'eip155:8453')).toEqual([ADDRESS]);
    expect(accountsFor(namespaceSession, 'eip155:10')).toEqual([ADDRESS]);
  });
});

describe('scopeNamespace', () => {
  it('reads a namespace from either key shape', () => {
    expect(scopeNamespace('eip155')).toBe('eip155');
    expect(scopeNamespace('eip155:8453')).toBe('eip155');
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

  it('still rejects a method outside the grant', () => {
    expect(() =>
      assertInvokeAuthorized(namespaceSession, {
        chainId: 'eip155:10',
        request: { method: 'wallet_sendCalls', params: [] },
        sessionId: 'session-1',
      })
    ).toThrow(/is not authorized/);
  });

  it('covers any chain requirement in the namespace', () => {
    expect(sessionCovers(namespaceSession, ['eip155:10'])).toBe(true);
    expect(sessionCovers(namespaceSession, [{ chainId: 'eip155:10', methods: ['personal_sign'] }])).toBe(
      true
    );
    expect(
      sessionCovers(namespaceSession, [{ chainId: 'eip155:10', methods: ['wallet_sendCalls'] }])
    ).toBe(false);
    expect(sessionCovers(chainSession, ['eip155:10'])).toBe(false);
  });

  it('projects accounts for every chain', () => {
    expect(projectEthAccounts(namespaceSession)).toEqual([ADDRESS]);
    expect(projectEthAccountsForChain(namespaceSession, 10)).toEqual([ADDRESS]);
    expect(projectEthAccountsForChain(chainSession, 10)).toEqual([]);
  });
});

describe('sessionFromCaip25Result', () => {
  it('keeps a chains-less namespace grant as one namespace scope', () => {
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

    expect(session.scopes).toEqual({
      eip155: { accounts: [ADDRESS], methods: ['eth_sendTransaction'] },
    });
    expect(grantFor(session, 'eip155:7777777')).toBeDefined();
  });

  it('still expands an enumerated namespace grant per chain', () => {
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

    expect(Object.keys(session.scopes)).toEqual(['eip155:8453', 'eip155:10']);
    expect(session.scopes['eip155:8453'].accounts).toEqual([`eip155:8453:${ADDRESS}`]);
    expect(grantFor(session, 'eip155:1')).toBeUndefined();
  });
});
