import { sessionFromAccounts } from '../session.js';
import { createActiveChain } from './activeChain.js';

const ACCOUNT = '0x0000000000000000000000000000000000000001' as const;

describe('createActiveChain', () => {
  it('uses the default chain when it is granted', () => {
    const chain = createActiveChain({
      defaultChainId: 8453,
      session: sessionFromAccounts({ accounts: [ACCOUNT], chainId: 8453 }),
      onChange: vi.fn(),
    });

    expect(chain.get()).toBe(8453);
  });

  it('falls back to the first granted chain', () => {
    const chain = createActiveChain({
      defaultChainId: 1,
      session: sessionFromAccounts({ accounts: [ACCOUNT], chainId: 8453 }),
      onChange: vi.fn(),
    });

    expect(chain.get()).toBe(8453);
  });

  it('keeps a metadata-known default chain without requiring a grant', () => {
    const session = {
      ...sessionFromAccounts({ accounts: [ACCOUNT], chainId: 8453 }),
      properties: {
        chainMetadata: {
          'eip155:1': { rpcUrl: 'https://ethereum.invalid' },
          'eip155:8453': { rpcUrl: 'https://base.invalid' },
        },
      },
    };
    const chain = createActiveChain({
      defaultChainId: 1,
      session,
      onChange: vi.fn(),
    });

    expect(chain.get()).toBe(1);
  });

  it('notifies only for actual, notifying selections', () => {
    const onChange = vi.fn();
    const chain = createActiveChain({ defaultChainId: 1, onChange });

    expect(chain.select(1)).toBe(false);
    expect(chain.select(8453, { notify: false })).toBe(true);
    expect(chain.select(10)).toBe(true);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('reconciles to a remaining granted chain', () => {
    const onChange = vi.fn();
    const chain = createActiveChain({ defaultChainId: 1, onChange });

    chain.reconcile(sessionFromAccounts({ accounts: [ACCOUNT], chainId: 8453 }));

    expect(chain.get()).toBe(8453);
    expect(onChange).toHaveBeenCalledWith(8453);
  });
});
