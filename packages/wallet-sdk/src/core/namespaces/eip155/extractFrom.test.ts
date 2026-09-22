import { extractFrom } from './extractFrom.js';

const ADDRESS = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca';

describe('extractFrom', () => {
  it('reads personal_sign params[1]', () => {
    expect(extractFrom({ method: 'personal_sign', params: ['0x68656c6c6f', ADDRESS] })).toBe(
      ADDRESS
    );
  });

  it('reads typed-data params[0]', () => {
    expect(extractFrom({ method: 'eth_signTypedData_v4', params: [ADDRESS, {}] })).toBe(ADDRESS);
  });

  it('reads eth_sign params[0] and wallet_sign params[0].address', () => {
    expect(extractFrom({ method: 'eth_sign', params: [ADDRESS, '0x68656c6c6f'] })).toBe(ADDRESS);
    expect(
      extractFrom({
        method: 'wallet_sign',
        params: [{ address: ADDRESS, version: '1.0', data: {} }],
      })
    ).toBe(ADDRESS);
  });

  it('reads tx from', () => {
    expect(
      extractFrom({ method: 'eth_sendTransaction', params: [{ from: ADDRESS, to: ADDRESS }] })
    ).toBe(ADDRESS);
    expect(extractFrom({ method: 'wallet_sendCalls', params: [{ from: ADDRESS }] })).toBe(ADDRESS);
  });

  it('returns undefined when the dapp omitted the signer', () => {
    expect(extractFrom({ method: 'personal_sign', params: ['0x68656c6c6f'] })).toBeUndefined();
    expect(
      extractFrom({ method: 'eth_sendTransaction', params: [{ to: ADDRESS }] })
    ).toBeUndefined();
    expect(extractFrom({ method: 'eth_sign', params: [{ address: ADDRESS }] })).toBeUndefined();
    expect(extractFrom({ method: 'wallet_sign', params: [{ data: {} }] })).toBeUndefined();
    expect(extractFrom({ method: 'eth_accounts', params: [] })).toBeUndefined();
  });
});
