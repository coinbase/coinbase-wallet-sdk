import { DEFAULT_CHAIN_ID, createActiveChain } from './activeChain.js';

describe('createActiveChain', () => {
  it('starts on Ethereum mainnet, whatever the session says', () => {
    // The active chain is presentation state, not authorization: it is constructed from
    // nothing at all, so no session — restored or otherwise — can relocate it.
    expect(createActiveChain({ onChange: vi.fn() }).get()).toBe(DEFAULT_CHAIN_ID);
    expect(DEFAULT_CHAIN_ID).toBe(1);
  });

  it('announces every chain it actually moves to', () => {
    const onChange = vi.fn();
    const chain = createActiveChain({ onChange });

    expect(chain.select(8453)).toBe(true);
    expect(chain.get()).toBe(8453);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(8453);
  });

  it('stays silent when asked for the chain it is already on', () => {
    const onChange = vi.fn();
    const chain = createActiveChain({ onChange });

    expect(chain.select(DEFAULT_CHAIN_ID)).toBe(false);
    expect(chain.get()).toBe(DEFAULT_CHAIN_ID);

    expect(chain.select(10)).toBe(true);
    expect(chain.select(10)).toBe(false);
    expect(chain.get()).toBe(10);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(10);
  });
});
