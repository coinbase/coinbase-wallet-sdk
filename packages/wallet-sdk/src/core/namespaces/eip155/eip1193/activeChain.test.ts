import { DEFAULT_CHAIN_ID, createActiveChain } from './activeChain.js';

describe('createActiveChain', () => {
  it('starts on Ethereum mainnet, whatever the session says', () => {
    // The active chain is presentation state, not authorization: it is constructed from
    // nothing at all, so no session — restored or otherwise — can relocate it.
    expect(createActiveChain({ onChange: vi.fn() }).get()).toBe(DEFAULT_CHAIN_ID);
    expect(DEFAULT_CHAIN_ID).toBe(1);
  });

  it('starts on the saved chain without announcing it, and saves every move', () => {
    let saved: number | undefined = 8453;
    const store = {
      get: () => saved,
      set: (chainId: number) => {
        saved = chainId;
      },
    };
    const onChange = vi.fn();
    const chain = createActiveChain({ store, onChange });

    expect(chain.get()).toBe(8453);
    expect(chain.select(8453)).toBe(false);
    expect(onChange).not.toHaveBeenCalled();

    chain.select(10);
    expect(saved).toBe(10);
    expect(createActiveChain({ store, onChange }).get()).toBe(10);
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
