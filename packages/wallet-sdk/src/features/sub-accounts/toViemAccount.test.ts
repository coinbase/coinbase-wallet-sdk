import { toViemAccount } from './toViemAccount.js';

describe('toViemAccount', () => {
  it('should create a viem account', () => {
    const account = toViemAccount({
      type: 'webAuthn',
      sign: vi.fn(),
      address: '0x',
    });
    expect(account.sign).toBeDefined();
    expect(account.signMessage).toBeDefined();
    expect(account.signTypedData).toBeDefined();
    expect(account.type).toBe('webAuthn');
    expect(account.publicKey).toBe('0x');
  });
});
