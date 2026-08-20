import { ingestPopupData } from './ingest.js';
import type { PopupWire } from './types.js';

vi.mock(':store/chain-clients/utils.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import(':store/chain-clients/utils.js')>();
  return { ...actual, createClients: vi.fn() };
});

describe('ingestPopupData', () => {
  it('writes chains, current chain, and capabilities', () => {
    const setChains = vi.fn();
    const setAccount = vi.fn();
    const wire = {
      chainId: () => 8453,
      store: {
        chains: { set: setChains },
        account: { set: setAccount },
      },
    } as unknown as Pick<PopupWire, 'store' | 'chainId'>;

    ingestPopupData(wire, {
      result: { value: null },
      data: {
        chains: { 1: 'https://eth.invalid', 8453: 'https://base.invalid' },
        nativeCurrencies: { 8453: { name: 'Ether', symbol: 'ETH', decimal: 18 } },
        capabilities: { '0x1': { atomic: { status: 'supported' } } },
      },
    });

    expect(setChains).toHaveBeenCalledWith([
      { id: 1, rpcUrl: 'https://eth.invalid' },
      {
        id: 8453,
        rpcUrl: 'https://base.invalid',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimal: 18 },
      },
    ]);
    expect(setAccount).toHaveBeenCalledWith({
      chain: expect.objectContaining({ id: 8453, rpcUrl: 'https://base.invalid' }),
    });
    expect(setAccount).toHaveBeenCalledWith({
      capabilities: { '0x1': { atomic: { status: 'supported' } } },
    });
  });

  it('no-ops when the response has no chain data', () => {
    const setChains = vi.fn();
    const wire = {
      chainId: () => 1,
      store: { chains: { set: setChains }, account: { set: vi.fn() } },
    } as unknown as Pick<PopupWire, 'store' | 'chainId'>;

    ingestPopupData(wire, { result: { value: null } });
    expect(setChains).not.toHaveBeenCalled();
  });
});
