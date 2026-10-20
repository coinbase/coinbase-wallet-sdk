import type { Session } from ':core/session/types.js';
import { EIP155_METHODS } from './methods.js';
import { sessionToWalletConnectResult, walletConnectToCaip25Scopes } from './walletConnect.js';

const ADDRESS = '0x0000000000000000000000000000000000000001';
const OTHER = '0x0000000000000000000000000000000000000002';

describe('sessionToWalletConnectResult', () => {
  it("returns each account's own answers and never the namespace-wide capabilities", () => {
    const session: Session = {
      sessionId: 'session-1',
      namespaces: {
        eip155: {
          accounts: [ADDRESS, OTHER],
          methods: [],
          capabilities: { paymasterService: { supported: true } },
          accountCapabilities: { [ADDRESS]: { aos: { signature: '0x111' } } },
        },
      },
    };

    expect(sessionToWalletConnectResult(session)).toEqual({
      accounts: [
        { address: ADDRESS, capabilities: { aos: { signature: '0x111' } } },
        { address: OTHER },
      ],
    });
  });

  it('returns no capabilities when the wallet sent no per-account answers', () => {
    const session: Session = {
      sessionId: 'session-1',
      namespaces: {
        eip155: {
          accounts: [ADDRESS],
          methods: [],
          capabilities: { paymasterService: { supported: true } },
        },
      },
    };

    expect(sessionToWalletConnectResult(session)).toEqual({ accounts: [{ address: ADDRESS }] });
  });
});

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
