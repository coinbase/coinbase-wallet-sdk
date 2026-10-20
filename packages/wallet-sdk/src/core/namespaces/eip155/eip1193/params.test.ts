import { parseSwitchChainId, parseWalletConnectParams } from './params.js';

describe('parseWalletConnectParams', () => {
  it("keeps the dapp's version and capabilities and drops anything else", () => {
    expect(
      parseWalletConnectParams([
        {
          version: '2',
          optionalMetadata: 'dropped',
          capabilities: { signInWithEthereum: { nonce: 'dapp' } },
        },
      ])
    ).toEqual([{ version: '2', capabilities: { signInWithEthereum: { nonce: 'dapp' } } }]);
  });

  it('defaults the version to 1', () => {
    expect(parseWalletConnectParams(undefined)).toEqual([{ version: '1' }]);
    expect(parseWalletConnectParams([{ version: '' }])).toEqual([{ version: '1' }]);
  });

  it('passes an empty capabilities object through as sent', () => {
    expect(parseWalletConnectParams([{ version: '1', capabilities: {} }])).toEqual([
      { version: '1', capabilities: {} },
    ]);
  });
});

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
