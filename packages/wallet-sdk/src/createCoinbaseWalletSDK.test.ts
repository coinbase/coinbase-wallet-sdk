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
    sdk.subaccount.setSigner(getSigner);
    expect(subaccounts.getState().getSigner).toBe(getSigner);
    // reset the state
    subaccounts.setState({ getSigner: null });
  });

  describe('subaccount.create', () => {
    afterEach(() => {
      subaccounts.setState({ account: undefined, getSigner: null });
    });

    it('should throw if no signer is set', async () => {
      const sdk = createCoinbaseWalletSDK(options);
      await expect(
        sdk.subaccount.create({
          type: 'create',
          keys: [
            {
              key: '0x123',
              type: 'p256',
            },
          ],
        })
      ).rejects.toThrow('no signer found');
    });

    it('should throw if subaccount already exists', async () => {
      const sdk = createCoinbaseWalletSDK({
        ...options,
        subaccount: { getSigner: () => Promise.resolve({} as any) },
      });
      subaccounts.setState({ account: { address: '0x123' } as any });
      await expect(
        sdk.subaccount.create({
          type: 'create',
          keys: [
            {
              key: '0x123',
              type: 'p256',
            },
          ],
        })
      ).rejects.toThrow('subaccount already exists');
      subaccounts.setState({ account: undefined });
    });

    it('should call wallet_addSubAccount with correct params', async () => {
      const mockRequest = vi.fn();
      const sdk = createCoinbaseWalletSDK({
        ...options,
        subaccount: { getSigner: () => Promise.resolve({} as any) },
      });
      vi.spyOn(sdk, 'getProvider').mockImplementation(() => ({ request: mockRequest }) as any);

      await sdk.subaccount.create({
        type: 'create',
        keys: [
          {
            key: '0x123',
            type: 'p256',
          },
        ],
      });
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'wallet_addSubAccount',
        params: [
          {
            version: '1',
            account: {
              type: 'create',
              keys: [
                {
                  key: '0x123',
                  type: 'p256',
                },
              ],
            },
          },
        ],
      });
    });
  });

  describe('subaccount.get', () => {
    afterEach(() => {
      subaccounts.setState({ account: undefined, getSigner: null });
    });

    it('should return existing account if it exists', async () => {
      const sdk = createCoinbaseWalletSDK(options);
      const mockAccount = { address: '0x123' };
      subaccounts.setState({ account: mockAccount as any });
      expect(await sdk.subaccount.get()).toBe(mockAccount);
      subaccounts.setState({ account: undefined });
    });

    it('should call wallet_connect if no account exists', async () => {
      const mockRequest = vi.fn().mockResolvedValue({
        accounts: [
          {
            address: '0x123',
          },
        ],
      });
      const sdk = createCoinbaseWalletSDK(options);
      vi.spyOn(sdk, 'getProvider').mockImplementation(() => ({ request: mockRequest }) as any);

      await sdk.subaccount.get();
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'wallet_connect',
        params: [
          {
            version: 1,
            capabilities: {
              getAppAccounts: true,
            },
          },
        ],
      });
    });
  });

  describe('subaccount.addOwner', () => {
    afterEach(() => {
      subaccounts.setState({ account: undefined, getSigner: null });
    });
    it('should throw if no signer is set', async () => {
      const sdk = createCoinbaseWalletSDK(options);
      await expect(
        sdk.subaccount.addOwner({
          chainId: 1,
          address: '0xE3cA9Cc9378143a26b9d4692Ca3722dc45910a15',
        })
      ).rejects.toThrow('no signer found');
    });

    it('should throw if no subaccount exists', async () => {
      const sdk = createCoinbaseWalletSDK({
        ...options,
        subaccount: { getSigner: () => Promise.resolve({} as any) },
      });
      await expect(
        sdk.subaccount.addOwner({
          chainId: 1,
          address: '0xE3cA9Cc9378143a26b9d4692Ca3722dc45910a15',
        })
      ).rejects.toThrow('subaccount does not exist');
    });

    it('should call wallet_sendCalls with address param', async () => {
      const mockRequest = vi.fn();
      const sdk = createCoinbaseWalletSDK({
        ...options,
        subaccount: { getSigner: () => Promise.resolve({} as any) },
      });
      subaccounts.setState({
        universalAccount: '0x789',
        account: { address: '0x456', root: '0x789' } as any,
      });
      vi.spyOn(sdk, 'getProvider').mockImplementation(() => ({ request: mockRequest }) as any);

      await sdk.subaccount.addOwner({
        chainId: 1,
        address: '0xE3cA9Cc9378143a26b9d4692Ca3722dc45910a15',
      });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'wallet_sendCalls',
        params: [
          {
            version: 1,
            chainId: '0x1',
            calls: [
              {
                to: '0x456',
                data: expect.any(String),
                value: '0x0',
              },
            ],
            from: '0x789',
          },
        ],
      });
      subaccounts.setState({ account: undefined });
    });

    it('should call wallet_sendCalls with publicKey param', async () => {
      const mockRequest = vi.fn();
      const sdk = createCoinbaseWalletSDK({
        ...options,
        subaccount: { getSigner: () => Promise.resolve({} as any) },
      });
      subaccounts.setState({
        universalAccount: '0x789',
        account: { address: '0x456' } as any,
      });
      vi.spyOn(sdk, 'getProvider').mockImplementation(() => ({ request: mockRequest }) as any);

      await sdk.subaccount.addOwner({
        chainId: 1,
        publicKey:
          '0x7da44d4bc972affd138c619a211ef0afe0926b813fec67d15587cf8625b2bf185f5044ae96640a63b32aa1eb6f8f993006bbd26292b81cb07a0672302c69a866',
      });
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'wallet_sendCalls',
        params: [
          {
            version: 1,
            chainId: '0x1',
            calls: [
              {
                to: '0x456',
                data: expect.any(String),
                value: '0x0',
              },
            ],
            from: '0x789',
          },
        ],
      });
      subaccounts.setState({ account: undefined });
    });
  });
});
