import { EIP155_METHODS } from './methods.js';

describe('EIP155_METHODS', () => {
  it('covers every Coinbase Wallet Signer popup method', () => {
    const signerPopup = [
      'personal_sign',
      'personal_ecRecover',
      'eth_ecRecover',
      'eth_signTransaction',
      'eth_sendTransaction',
      'eth_signTypedData',
      'eth_signTypedData_v1',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4',
      'wallet_sign',
      'wallet_sendCalls',
      'wallet_showCallsStatus',
      'wallet_grantPermissions',
      'wallet_addEthereumChain',
      'wallet_watchAsset',
    ];
    for (const method of signerPopup) {
      expect(EIP155_METHODS).toContain(method);
    }
  });

  it('excludes the methods that belong on the chain RPC', () => {
    // Membership is the routing rule, so a read-only method landing here would be sent
    // to the wallet instead of `chain.rpcUrl`.
    expect(EIP155_METHODS).not.toContain('eth_call');
    expect(EIP155_METHODS).not.toContain('eth_getBalance');
    expect(EIP155_METHODS).not.toContain('wallet_getCapabilities');
    expect(EIP155_METHODS).not.toContain('wallet_getCallsStatus');
  });
});
