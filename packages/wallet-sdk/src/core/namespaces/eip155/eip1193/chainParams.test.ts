import { switchChainId } from './chainParams.js';

describe('switchChainId', () => {
  it('parses a hex chainId', () => {
    expect(switchChainId([{ chainId: '0x2105' }])).toBe(8453);
  });

  it('rejects missing or non-object params', () => {
    expect(() => switchChainId(undefined)).toThrow();
    expect(() => switchChainId([])).toThrow();
    expect(() => switchChainId(['0x1'])).toThrow();
  });
});
