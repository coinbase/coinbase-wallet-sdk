import { eip155Caip2, eip155ChainId, formatEip155Account } from './caip.js';

describe('eip155 CAIP helpers', () => {
  it('maps numeric chain ids and accounts to and from CAIP identifiers', () => {
    expect(eip155Caip2(8453)).toBe('eip155:8453');
    expect(eip155ChainId('eip155:8453')).toBe(8453);
    expect(formatEip155Account(8453, '0xabc')).toBe('eip155:8453:0xabc');
  });

  it('does not parse another namespace as an EVM chain', () => {
    expect(eip155ChainId('solana:mainnet')).toBeNull();
    expect(eip155ChainId('eip155:01')).toBeNull();
    expect(() => eip155Caip2(0)).toThrowError(expect.objectContaining({ code: -32602 }));
  });
});
