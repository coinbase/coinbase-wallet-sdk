import { formatEip155ChainId, parseEip155ChainId } from './caip.js';

describe('eip155 CAIP helpers', () => {
  it('round-trips a numeric chain id through CAIP-2', () => {
    expect(formatEip155ChainId(8453)).toBe('eip155:8453');
    expect(parseEip155ChainId('eip155:8453')).toBe(8453);
  });

  it('does not parse another namespace as an EVM chain', () => {
    expect(parseEip155ChainId('solana:mainnet')).toBeNull();
    expect(parseEip155ChainId('eip155:01')).toBeNull();
    expect(() => formatEip155ChainId(0)).toThrowError(expect.objectContaining({ code: -32602 }));
  });
});
