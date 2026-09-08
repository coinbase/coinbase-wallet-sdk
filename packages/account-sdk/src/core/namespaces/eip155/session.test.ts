import { Address } from ':core/type/index.js';
import {
  firstEip155ChainId,
  firstGlobalEip155Account,
  isKnownEip155Chain,
  projectEip155Capabilities,
  projectEip155ChainMetadata,
  projectEthAccounts,
  projectEthAccountsForChain,
  rpcUrlForEip155Chain,
  sessionFromAccounts,
  withEip155Accounts,
} from './session.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;
const OTHER = '0x0000000000000000000000000000000000000001' as Address;
const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

describe('EIP-155 session selectors', () => {
  it('builds scope/account lists without selected state', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS, OTHER], chainId: 8453 });

    expect(session.scopes['eip155:8453']?.accounts).toEqual([
      `eip155:8453:${ADDRESS}`,
      `eip155:8453:${OTHER}`,
    ]);
    expect(session).not.toHaveProperty('selected');
  });

  it('returns unique EIP-155 addresses and ignores other namespaces', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    session.scopes[SOLANA] = {
      accounts: [`${SOLANA}:So11111111111111111111111111111111111111112`],
      methods: ['solana_signMessage'],
    };

    expect(projectEthAccounts(session)).toEqual([ADDRESS]);
  });

  it('returns wallet-ordered accounts for one exact chain', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    session.scopes['eip155:8453'] = {
      accounts: [`eip155:8453:${OTHER}`, `eip155:8453:${ADDRESS}`],
      methods: [],
    };

    expect(projectEthAccountsForChain(session, 8453)).toEqual([OTHER, ADDRESS]);
    expect(firstEip155ChainId(session)).toBe(1);
    expect(firstGlobalEip155Account(session, 8453, OTHER)).toBe(ADDRESS);
  });

  it('projects chain metadata, RPC URL, and capabilities', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    session.scopes['eip155:8453'].capabilities = { atomic: { supported: true } };
    session.properties = {
      chainMetadata: {
        'eip155:8453': {
          rpcUrl: 'https://mainnet.base.org',
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimal: 18 },
        },
        'solana:mainnet': { rpcUrl: 'https://solana.invalid' },
      },
    };

    expect(projectEip155ChainMetadata(session)).toEqual([
      {
        id: 8453,
        rpcUrl: 'https://mainnet.base.org',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimal: 18 },
      },
    ]);
    expect(rpcUrlForEip155Chain(session, 8453)).toBe('https://mainnet.base.org');
    expect(isKnownEip155Chain(session, 8453)).toBe(true);
    expect(isKnownEip155Chain(session, 1)).toBe(false);
    expect(projectEip155Capabilities(session)).toEqual({
      '0x2105': { atomic: { supported: true } },
    });
  });
});

describe('withEip155Accounts', () => {
  it('updates one scope without adding selected state or losing grants', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    session.sessionId = 'session-1';
    session.scopes['eip155:1'].capabilities = { atomic: true };

    const updated = withEip155Accounts(session, 1, [OTHER]);

    expect(updated).not.toHaveProperty('selected');
    expect(updated.sessionId).toBe('session-1');
    expect(updated.scopes['eip155:1']).toEqual({
      accounts: [`eip155:1:${OTHER}`],
      methods: session.scopes['eip155:1'].methods,
      capabilities: { atomic: true },
    });
  });

  it('returns the same session when the target scope is missing', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });

    expect(withEip155Accounts(session, 8453, [OTHER])).toBe(session);
  });
});
