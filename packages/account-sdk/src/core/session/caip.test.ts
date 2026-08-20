import {
  BITCOIN_MAINNET,
  SOLANA_MAINNET,
  accountOf,
  eip155Caip2,
  formatEip155Account,
  namespaceOf,
  parseCaip2,
} from './caip.js';

describe('caip', () => {
  it('parses eip155, solana, and bip122', () => {
    expect(parseCaip2('eip155:8453')).toEqual({ namespace: 'eip155', reference: '8453' });
    expect(namespaceOf(SOLANA_MAINNET)).toBe('solana');
    expect(namespaceOf(BITCOIN_MAINNET)).toBe('bip122');
    expect(eip155Caip2(1)).toBe('eip155:1');
    expect(accountOf(formatEip155Account(8453, '0xabc'))).toBe('0xabc');
  });
});
