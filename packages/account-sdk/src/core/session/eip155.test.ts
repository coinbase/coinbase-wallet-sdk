import { Address } from ':core/type/index.js';
import {
  projectEthAccounts,
  selectedEip155ChainId,
  sessionFromAccounts,
  withEip155Accounts,
  withEip155Chain,
} from './eip155.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;
const OTHER = '0x0000000000000000000000000000000000000001' as Address;
const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

describe('sessionFromAccounts', () => {
  it('builds an eip155 session from a flat address list', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS, OTHER], chainId: 8453 });
    expect(session.scopes['eip155:8453']?.accounts).toEqual([
      `eip155:8453:${ADDRESS}`,
      `eip155:8453:${OTHER}`,
    ]);
    expect(session.selected.eip155).toBe(`eip155:8453:${ADDRESS}`);
    expect(session.transportKind).toBe('popup');
  });
});

describe('projectEthAccounts', () => {
  it('returns unique eip155 addresses and ignores other namespaces', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    session.scopes[SOLANA] = {
      accounts: [`${SOLANA}:So11111111111111111111111111111111111111112`],
      methods: ['solana_signMessage'],
    };
    expect(projectEthAccounts(session)).toEqual([ADDRESS]);
  });
});

describe('selectedEip155ChainId', () => {
  it('reads the selected account chain, else the first eip155 scope', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    expect(selectedEip155ChainId(session)).toBe(8453);
    session.selected = {};
    expect(selectedEip155ChainId(session)).toBe(8453);
  });
});

describe('withEip155Chain', () => {
  it('does not copy grants onto an unauthorized chain id', () => {
    const session = withEip155Chain(sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 }), 8453);
    expect(session.selected.eip155).toBe(`eip155:1:${ADDRESS}`);
    expect(session.scopes['eip155:8453']).toBeUndefined();
  });

  it('updates accounts without losing session grants', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    session.sessionId = 'session-1';
    session.scopes['eip155:1'].capabilities = { atomic: true };
    const updated = withEip155Accounts(session, 1, [OTHER]);
    expect(updated.sessionId).toBe('session-1');
    expect(updated.scopes['eip155:1']).toEqual({
      accounts: [`eip155:1:${OTHER}`],
      methods: session.scopes['eip155:1'].methods,
      capabilities: { atomic: true },
    });
  });
});
