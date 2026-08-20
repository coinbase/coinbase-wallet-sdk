import { WALLET_METHODS } from './methods.js';

describe('WALLET_METHODS', () => {
  it('routes sign/send through invoke, not chain RPC', () => {
    expect(WALLET_METHODS.has('personal_sign')).toBe(true);
    expect(WALLET_METHODS.has('eth_sendTransaction')).toBe(true);
    expect(WALLET_METHODS.has('wallet_sendCalls')).toBe(true);
    expect(WALLET_METHODS.has('eth_call')).toBe(false);
    expect(WALLET_METHODS.has('eth_getBalance')).toBe(false);
  });
});
