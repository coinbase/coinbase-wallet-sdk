import {
  createCoinbaseWalletSDK,
  CreateCoinbaseWalletSDKOptions,
} from './createCoinbaseWalletSDK.js';
import { subaccounts } from ':stores/sub-accounts/store.js';
const options: CreateCoinbaseWalletSDKOptions = {
  appName: 'Dapp',
  appLogoUrl: 'https://example.com/favicon.ico',
  appChainIds: [],
  preference: { options: 'all' },
};

vi.mock('./util/checkCrossOriginOpenerPolicy');

describe('createCoinbaseWalletSDK', () => {
  it('should return an object with a getProvider method', () => {
    const sdk = createCoinbaseWalletSDK(options);
    expect(sdk).toHaveProperty('getProvider');
    expect(typeof sdk.getProvider).toBe('function');
  });

  it('should return the same provider instance on subsequent calls to getProvider', () => {
    const sdk = createCoinbaseWalletSDK(options);
    const provider1 = sdk.getProvider();
    const provider2 = sdk.getProvider();
    expect(provider1).toBe(provider2);
  });

  it('should set the signer in the sub account store', () => {
    expect(subaccounts.getState().getSigner).toBe(null);

    createCoinbaseWalletSDK({
      ...options,
      subaccount: { getSigner: () => Promise.resolve({} as any) },
    });

    expect(subaccounts.getState().getSigner).toBeDefined();

    // reset the state
    subaccounts.setState({ getSigner: null });
  });

  it('should throw an error if the signer is not a function', () => {
    expect(() =>
      createCoinbaseWalletSDK({
        ...options,
        subaccount: { getSigner: {} as any },
      })
    ).toThrow('getSigner is not a function');
  });

  it('when set signer is called, it should set the signer in the sub account store', () => {
    expect(subaccounts.getState().getSigner).toBe(null);
    const sdk = createCoinbaseWalletSDK(options);
    const getSigner = () => Promise.resolve({} as any);
    sdk.accounts.setSigner(getSigner);
    expect(subaccounts.getState().getSigner).toBe(getSigner);
    // reset the state
    subaccounts.setState({ getSigner: null });
  });
});
