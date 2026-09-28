import { parseSwitchChainId } from './params.js';

describe('parseSwitchChainId', () => {
  it('parses a hex chainId', () => {
    expect(parseSwitchChainId([{ chainId: '0x2105' }])).toBe(8453);
  });

  it('rejects missing or non-object params', () => {
    expect(() => parseSwitchChainId(undefined)).toThrow(/expected \[\{ chainId \}\]/);
    expect(() => parseSwitchChainId([])).toThrow(/expected \[\{ chainId \}\]/);
    // The bare hex string is the shape dapps get wrong, so the error has to name the
    // one it wanted.
    expect(() => parseSwitchChainId(['0x1'])).toThrow(/expected \[\{ chainId \}\]/);
  });
});
