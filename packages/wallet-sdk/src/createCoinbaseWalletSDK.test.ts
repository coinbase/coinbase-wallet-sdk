import { Address } from 'viem';

import { store } from ':store/store.js';
import {
  CreateCoinbaseWalletSDKOptions,
  createCoinbaseWalletSDK,
} from './createCoinbaseWalletSDK.js';

const options: CreateCoinbaseWalletSDKOptions = {
  appName: 'Dapp',
  appLogoUrl: 'https://example.com/favicon.ico',
  appChainIds: [],
  preference: { options: 'all' },
};

vi.mock('./util/checkCrossOriginOpenerPolicy');

describe('createCoinbaseWalletSDK', () => {
  afterEach(() => {
    store.setState({});
  });

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
    expect(store.getState().toSubAccountSigner).toBeUndefined();

    createCoinbaseWalletSDK({
      ...options,
      subAccounts: {
        toOwnerAccount: () => Promise.resolve({} as any),
      },
    });

    expect(store.subAccountsConfig.get()?.toOwnerAccount).toBeDefined();
  });

  it('should throw an error if the signer is not a function', () => {
    expect(() =>
      createCoinbaseWalletSDK({
        ...options,
        subAccounts: {
          enableAutoSubAccounts: true,
          toOwnerAccount: {} as any,
        },
      })
    ).toThrow('toAccount is not a function');
  });

  it('when set signer is called, it should set the signer in the sub account store', () => {
    expect(store.getState().toSubAccountSigner).toBeUndefined();

    const sdk = createCoinbaseWalletSDK(options);
    const toAccount = () => Promise.resolve({} as any);

    sdk.subAccount.setToOwnerAccount(toAccount);

    expect(store.subAccountsConfig.get()?.toOwnerAccount).toBeDefined();
  });

  describe('subaccount.create', () => {
    afterEach(() => {
      store.subAccounts.clear();
    });

    it('should throw if subaccount already exists', async () => {
      const sdk = createCoinbaseWalletSDK({
        ...options,
        subAccounts: {
          toOwnerAccount: () => Promise.resolve({} as any),
        },
      });
      await expect(
        sdk.subAccount.create({
          type: 'create',
          keys: [
            {
              publicKey: '0x123',
              type: 'p256',
            },
          ],
        })
      ).rejects.toThrow('subaccount already exists');
      store.subAccounts.clear();
    });

    it('should call wallet_addSubAccount with correct params', async () => {
      store.subAccounts.set({
        address: '0x123',
      });
      const mockRequest = vi.fn();
      const sdk = createCoinbaseWalletSDK({
        ...options,
        subAccounts: {
          toOwnerAccount: () => Promise.resolve({} as any),
        },
      });
      vi.spyOn(sdk, 'getProvider').mockImplementation(() => ({ request: mockRequest }) as any);

      await sdk.subAccount.create({
        type: 'create',
        keys: [
          {
            publicKey: '0x123',
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
                  publicKey: '0x123',
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
      store.subAccounts.clear();
    });

    it('should return existing account if it exists', async () => {
      const sdk = createCoinbaseWalletSDK(options);
      const mockAccount = { address: '0x123' as Address };
      store.subAccounts.set(mockAccount);
      expect(await sdk.subAccount.get()).toEqual(mockAccount);
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

      await sdk.subAccount.get();

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'wallet_connect',
        })
      );
    });
  });

  describe('subaccount.addOwner', () => {
    afterEach(() => {
      store.subAccounts.clear();
    });

    it('should throw if not global account is set', async () => {
      const sdk = createCoinbaseWalletSDK(options);
      await expect(
        sdk.subAccount.addOwner({
          chainId: 1,
          address: '0xE3cA9Cc9378143a26b9d4692Ca3722dc45910a15',
        })
      ).rejects.toThrow('account does not exist');
    });

    it('should throw if no subaccount exists', async () => {
      store.account.set({
        accounts: ['0x123'],
      });
      const sdk = createCoinbaseWalletSDK({
        ...options,
        subAccounts: {
          toOwnerAccount: () => Promise.resolve({} as any),
        },
      });
      await expect(
        sdk.subAccount.addOwner({
          chainId: 1,
          address: '0xE3cA9Cc9378143a26b9d4692Ca3722dc45910a15',
        })
      ).rejects.toThrow('subaccount does not exist');
    });

    it('should call wallet_sendCalls with address param', async () => {
      const mockRequest = vi.fn();
      const sdk = createCoinbaseWalletSDK({
        ...options,
        subAccounts: {
          toOwnerAccount: () => Promise.resolve({} as any),
        },
      });
      store.setState({
        toSubAccountSigner: () => Promise.resolve({} as any),
      });
      store.setState({
        account: {
          accounts: ['0x123'],
        },
        subAccount: {
          address: '0x789',
        },
      });
      vi.spyOn(sdk, 'getProvider').mockImplementation(() => ({ request: mockRequest }) as any);

      await sdk.subAccount.addOwner({
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
                to: '0x789',
                data: expect.any(String),
                value: '0x0',
              },
            ],
            from: '0x123',
          },
        ],
      });
      store.subAccounts.clear();
    });

    it('should call wallet_sendCalls with publicKey param', async () => {
      const mockRequest = vi.fn();
      const sdk = createCoinbaseWalletSDK({
        ...options,
        subAccounts: {
          toOwnerAccount: () => Promise.resolve({} as any),
        },
      });
      store.setState({
        toSubAccountSigner: () => Promise.resolve({} as any),
      });
      store.setState({
        account: {
          accounts: ['0x123'],
        },
        subAccount: {
          address: '0x789',
        },
      });
      vi.spyOn(sdk, 'getProvider').mockImplementation(() => ({ request: mockRequest }) as any);

      await sdk.subAccount.addOwner({
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
                to: '0x789',
                data: expect.any(String),
                value: '0x0',
              },
            ],
            from: '0x123',
          },
        ],
      });
      store.subAccounts.clear();
    });
  });
});
