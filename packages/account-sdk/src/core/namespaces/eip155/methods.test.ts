import { WALLET_METHODS } from './methods.js';

describe('WALLET_METHODS', () => {
  it('matches Coinbase Wallet Signer popup methods', () => {
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
      expect(WALLET_METHODS.has(method)).toBe(true);
    }
    expect(WALLET_METHODS.has('eth_call')).toBe(false);
    expect(WALLET_METHODS.has('eth_getBalance')).toBe(false);
    expect(WALLET_METHODS.has('wallet_getCapabilities')).toBe(false);
    expect(WALLET_METHODS.has('wallet_getCallsStatus')).toBe(false);
  });
});
