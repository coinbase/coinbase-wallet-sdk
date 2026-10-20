import { EIP155_METHODS } from './methods.js';
import { walletConnectToCaip25Scopes } from './walletConnect.js';

describe('walletConnectToCaip25Scopes', () => {
  it('puts the version and capabilities on the eip155 scope', () => {
    expect(
      walletConnectToCaip25Scopes([
        { version: '2', capabilities: { signInWithEthereum: { nonce: 'dapp' } } },
      ])
    ).toEqual({
      eip155: {
        methods: EIP155_METHODS,
        notifications: ['accountsChanged', 'chainChanged'],
        capabilities: { signInWithEthereum: { nonce: 'dapp' } },
        version: '2',
      },
    });
  });

  it('forwards an empty capabilities object untouched', () => {
    expect(
      walletConnectToCaip25Scopes([{ version: '1', capabilities: {} }]).eip155?.capabilities
    ).toEqual({});
  });

  it('always requests the whole eip155 namespace, never a single chain', () => {
    const scopes = walletConnectToCaip25Scopes([{ version: '1' }]);

    // Connect can no longer be narrowed to (or fail on) a specific chain: there is
    // exactly one EVM scope, keyed by the bare namespace with no `chains` array.
    expect(Object.keys(scopes)).toEqual(['eip155']);
    expect(scopes.eip155).not.toHaveProperty('chains');
  });
});
