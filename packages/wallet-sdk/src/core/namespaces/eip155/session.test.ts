import { Address } from ':core/type/index.js';
import { sessionFromAccounts } from './session.fixtures.js';
import {
  activeEip155Grant,
  isKnownEip155Chain,
  projectEip155Capabilities,
  projectEip155ChainMetadata,
  projectEthAccounts,
  rpcUrlForEip155Chain,
  withEip155Accounts,
} from './session.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address;
const OTHER = '0x0000000000000000000000000000000000000001' as Address;

describe('EIP-155 session selectors', () => {
  it('builds one namespace-wide grant with raw accounts and no selected state', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS, OTHER], chainId: 8453 });

    expect(session.namespaces.eip155?.accounts).toEqual([ADDRESS, OTHER]);
    expect(session.namespaces).not.toHaveProperty('eip155:8453');
    expect(session).not.toHaveProperty('selected');
  });

  it('seeds the chain catalog from chainId/chains without widening authorization', () => {
    const single = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    expect(isKnownEip155Chain(single, 8453)).toBe(true);
    expect(isKnownEip155Chain(single, 1)).toBe(false);

    const many = sessionFromAccounts({ accounts: [ADDRESS], chains: [1, 8453] });
    expect(Object.keys(many.namespaces)).toEqual(['eip155']);
    expect(projectEip155ChainMetadata(many).map((chain) => chain.id)).toEqual([1, 8453]);
  });

  it('returns unique EIP-155 addresses and ignores other namespaces', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    session.namespaces.solana = {
      accounts: ['So11111111111111111111111111111111111111112'],
      methods: ['solana_signMessage'],
    };

    expect(projectEthAccounts(session)).toEqual([ADDRESS]);
  });

  it('projects the same accounts for every chain in the catalog', () => {
    // Authorization is namespace-wide: the one grant is the account list on chain 1 and
    // on chain 8453 alike. The catalog says which chains the wallet can serve, never who
    // is authorized, so it never narrows the projected accounts.
    const session = sessionFromAccounts({ accounts: [ADDRESS, OTHER], chains: [1, 8453] });

    expect(activeEip155Grant(session)?.accounts).toEqual([ADDRESS, OTHER]);
    expect(projectEthAccounts(session)).toEqual([ADDRESS, OTHER]);
    expect(isKnownEip155Chain(session, 1)).toBe(true);
    expect(isKnownEip155Chain(session, 8453)).toBe(true);
  });

  it('projects chain metadata, RPC URL, and capabilities', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
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
  });

  it('reports namespace-wide capabilities on 0x0 and per-chain ones on their chain', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 8453 });
    session.namespaces.eip155.capabilities = { paymasterService: { supported: true } };
    session.properties = {
      chainMetadata: {
        'eip155:8453': { capabilities: { atomic: { supported: true } } },
      },
    };

    expect(projectEip155Capabilities(session)).toEqual({
      '0x0': { paymasterService: { supported: true } },
      '0x2105': { atomic: { supported: true } },
    });
  });
});

describe('withEip155Accounts', () => {
  it('updates the grant without adding selected state or losing other fields', () => {
    const session = sessionFromAccounts({ accounts: [ADDRESS], chainId: 1 });
    session.sessionId = 'session-1';
    session.namespaces.eip155.capabilities = { atomic: true };

    const updated = withEip155Accounts(session, [OTHER]);

    expect(updated).not.toHaveProperty('selected');
    expect(updated.sessionId).toBe('session-1');
    expect(updated.namespaces.eip155).toEqual({
      accounts: [OTHER],
      methods: session.namespaces.eip155.methods,
      capabilities: { atomic: true },
    });
  });

  it('returns the same session when there is no eip155 grant', () => {
    const session = { namespaces: {} };

    expect(withEip155Accounts(session, [OTHER])).toBe(session);
  });
});
