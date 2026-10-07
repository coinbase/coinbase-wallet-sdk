import { SOLANA_WALLET_METHODS } from './methods.js';

describe('SOLANA_WALLET_METHODS', () => {
  it('contains only the currently supported signing kernel methods', () => {
    expect([...SOLANA_WALLET_METHODS]).toEqual([
      'solana_signMessage',
      'solana_signTransaction',
      'solana_signAndSendTransaction',
      'solana_signAndSendAllTransactions',
    ]);
  });
});
