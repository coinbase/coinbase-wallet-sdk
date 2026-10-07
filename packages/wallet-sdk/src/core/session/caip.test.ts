import { accountOf, formatCaip2, formatCaip10, namespaceOf, parseCaip2 } from './caip.js';

describe('caip', () => {
  it('parses eip155, solana, and bip122', () => {
    expect(parseCaip2('eip155:8453')).toEqual({ namespace: 'eip155', reference: '8453' });
    expect(namespaceOf('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBe('solana');
    expect(namespaceOf('bip122:000000000019d6689c085ae165831e93')).toBe('bip122');
    expect(accountOf(formatCaip10('eip155:8453', '0xabc'))).toBe('0xabc');
  });

  it('uses standardized invalid-params errors for malformed identifiers', () => {
    expect(() => formatCaip2('x', '')).toThrowError(expect.objectContaining({ code: -32602 }));
    expect(() => formatCaip10('eip155:1', '')).toThrowError(
      expect.objectContaining({ code: -32602 })
    );
    expect(() => namespaceOf('invalid')).toThrowError(expect.objectContaining({ code: -32602 }));
  });
});
