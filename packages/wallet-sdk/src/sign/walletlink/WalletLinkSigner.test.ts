import { fireEvent } from '@testing-library/preact';

import { LOCAL_STORAGE_ADDRESSES_KEY } from './relay/constants';
import { MOCK_ADDERESS, MOCK_SIGNED_TX, MOCK_TX, MOCK_TYPED_DATA } from './relay/mocks/fixtures';
import { mockedWalletLinkRelay } from './relay/mocks/relay';
import { WalletLinkRelay } from './relay/WalletLinkRelay';
import { WalletLinkSigner } from './WalletLinkSigner';
import { WALLETLINK_URL } from ':core/constants';
import { standardErrorCodes, standardErrors } from ':core/error';
import { AddressString } from ':core/type';
import { ScopedLocalStorage } from ':util/ScopedLocalStorage';

jest.mock('./relay/WalletLinkRelay', () => {
  return {
    WalletLinkRelay: mockedWalletLinkRelay,
  };
});

const testStorage = new ScopedLocalStorage('walletlink', WALLETLINK_URL);

const createAdapter = (options?: { relay?: WalletLinkRelay }) => {
  const adapter = new WalletLinkSigner({
    metadata: { appName: 'test', appLogoUrl: null, appChainIds: [1] },
    updateListener: {
      onAccountsUpdate: () => {},
      onChainUpdate: () => {},
    },
  });
  if (options?.relay) {
    (adapter as any)._relay = options.relay;
  }
  return adapter;
};

describe('LegacyProvider', () => {
  afterEach(() => {
    testStorage.clear();
  });

  it('handles enabling the provider successfully', async () => {
    const provider = createAdapter();
    const response = await provider.request<AddressString[]>({ method: 'eth_requestAccounts' });
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it('handles close', async () => {
    const relay = mockedWalletLinkRelay();
    const spy = jest.spyOn(relay, 'resetAndReload');

    const provider = createAdapter({ relay });
    await provider.disconnect();
    expect(spy).toHaveBeenCalled();
  });

  it('handles making a rpc request', async () => {
    const provider = createAdapter();
    const response = await provider.request<string[]>({
      method: 'eth_requestAccounts',
    });
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it("does NOT update the providers address on a postMessage's 'addressesChanged' event", () => {
    const provider = createAdapter();

    // @ts-expect-error _addresses is private
    expect(provider._addresses).toEqual([]);

    const url = 'dapp.finance';
    Object.defineProperty(window, 'location', { value: { origin: url } });
    fireEvent(
      window,
      new MessageEvent('message', {
        data: {
          data: {
            action: 'addressesChanged',
            addresses: ['0x0000000000000000000000000000000000001010'],
          },
          type: 'walletLinkMessage',
        },
        origin: url,
        source: window,
      })
    );

    // @ts-expect-error _addresses is private
    expect(provider._addresses).toEqual([]);
  });

  it('returns the users address on future eth_requestAccounts calls', async () => {
    const provider = createAdapter();
    // Set the account on the first request
    const response1 = await provider.request<string[]>({
      method: 'eth_requestAccounts',
    });
    expect(response1[0]).toBe(MOCK_ADDERESS.toLowerCase());

    // @ts-expect-error accessing private value for test
    expect(provider._addresses).toEqual([MOCK_ADDERESS.toLowerCase()]);

    // Set the account on the first request
    const response2 = await provider.request<string[]>({
      method: 'eth_requestAccounts',
    });
    expect(response2[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it('gets the users address from storage on init', async () => {
    testStorage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, MOCK_ADDERESS.toLowerCase());
    const provider = createAdapter();

    // @ts-expect-error accessing private value for test
    expect(provider._addresses).toEqual([MOCK_ADDERESS.toLowerCase()]);

    // Set the account on the first request
    const response = await provider.request<string[]>({
      method: 'eth_requestAccounts',
    });
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  describe('RPC Methods', () => {
    let provider: WalletLinkSigner | null = null;
    beforeEach(() => {
      testStorage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, MOCK_ADDERESS.toLowerCase());
      provider = createAdapter();
    });

    afterEach(() => {
      provider = null;
    });

    test('eth_accounts', async () => {
      const response = await provider?.request({
        method: 'eth_accounts',
      });
      expect(response).toEqual([MOCK_ADDERESS.toLowerCase()]);
    });

    test('eth_coinbase', async () => {
      const response = await provider?.request({
        method: 'eth_coinbase',
      });
      expect(response).toBe(MOCK_ADDERESS.toLowerCase());
    });

    test('net_version', async () => {
      const response = await provider?.request({
        method: 'net_version',
      });
      expect(response).toEqual('1');
    });

    test('eth_chainId', async () => {
      const response = await provider?.request<string>({
        method: 'eth_chainId',
      });
      expect(response).toEqual('0x1');
    });

    test('eth_requestAccounts', async () => {
      const response = await provider?.request({
        method: 'eth_requestAccounts',
      });
      expect(response).toEqual([MOCK_ADDERESS.toLowerCase()]);
    });

    test('eth_sign success', async () => {
      const response = await provider?.request({
        method: 'eth_sign',
        params: [MOCK_ADDERESS.toLowerCase(), 'Super safe message'],
      });
      expect(response).toBe('0x');
    });

    test('eth_sign fail bad address', async () => {
      await expect(
        () =>
          provider?.request({
            method: 'eth_sign',
            params: ['0x123456789abcdef', 'Super safe message'],
          })
      ).rejects.toThrowEIPError(
        standardErrorCodes.rpc.invalidParams,
        'Invalid Ethereum address: 0x123456789abcdef'
      );
    });

    test('eth_sign fail bad message format', async () => {
      await expect(
        () =>
          provider?.request({
            method: 'eth_sign',
            params: [MOCK_ADDERESS.toLowerCase(), 123456789],
          })
      ).rejects.toThrowEIPError(standardErrorCodes.rpc.invalidParams, 'Not binary data: 123456789');
    });

    test('eth_ecRecover', async () => {
      const response = await provider?.request({
        method: 'eth_ecRecover',
        params: ['Super safe message', '0x'],
      });
      expect(response).toBe(MOCK_ADDERESS);
    });

    test('personal_sign success', async () => {
      const response = await provider?.request({
        method: 'personal_sign',
        params: ['My secret message', MOCK_ADDERESS.toLowerCase()],
      });
      expect(response).toBe('0x');
    });

    test('personal_sign fail', async () => {
      await expect(
        () =>
          provider?.request({
            method: 'personal_sign',
            params: ['0x123456789abcdef', 'Super safe message'],
          })
      ).rejects.toThrowEIPError(
        standardErrorCodes.rpc.invalidParams,
        'Invalid Ethereum address: Super safe message'
      );
    });

    test('personal_ecRecover', async () => {
      const response = await provider?.request({
        method: 'personal_ecRecover',
        params: ['Super safe message', '0x'],
      });
      expect(response).toBe(MOCK_ADDERESS);
    });

    test('eth_signTransaction', async () => {
      const response = await provider?.request({
        method: 'eth_signTransaction',
        params: [
          {
            from: MOCK_ADDERESS,
            to: MOCK_ADDERESS,
            gasPrice: '21000',
            maxFeePerGas: '10000000000',
            maxPriorityFeePerGas: '10000000000',
            gas: '10000000000',
            value: '10000000000',
            data: '0xA0',
            nonce: 1,
          },
        ],
      });
      expect(response).toBe(MOCK_TX);
    });

    test('eth_sendRawTransaction', async () => {
      const response = await provider?.request({
        method: 'eth_sendRawTransaction',
        params: [MOCK_SIGNED_TX],
      });
      expect(response).toBe(MOCK_TX);
    });

    test('eth_sendTransaction', async () => {
      const response = await provider?.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: MOCK_ADDERESS,
            to: MOCK_ADDERESS,
            gasPrice: '21000',
            maxFeePerGas: '10000000000',
            maxPriorityFeePerGas: '10000000000',
            gas: '10000000000',
            value: '10000000000',
            data: '0xA0',
            nonce: 1,
          },
        ],
      });
      expect(response).toBe(MOCK_TX);
    });

    // eslint-disable-next-line
    test.skip('eth_signTypedData_v1', async () => {
      const response = await provider?.request({
        method: 'eth_signTypedData_v1',
        params: [[MOCK_TYPED_DATA], MOCK_ADDERESS],
      });
      expect(response).toBe('0x');
    });

    test('eth_signTypedData_v2', async () => {
      await expect(
        () =>
          provider?.request({
            method: 'eth_signTypedData_v2',
            params: [],
          })
      ).rejects.toThrowEIPError(
        standardErrorCodes.provider.unsupportedMethod,
        'The requested method is not supported by this Ethereum provider.'
      );
    });

    test('eth_signTypedData_v3', async () => {
      const response = await provider?.request({
        method: 'eth_signTypedData_v3',
        params: [MOCK_ADDERESS, MOCK_TYPED_DATA],
      });
      expect(response).toBe('0x');
    });

    test('eth_signTypedData_v4', async () => {
      const response = await provider?.request({
        method: 'eth_signTypedData_v4',
        params: [MOCK_ADDERESS, MOCK_TYPED_DATA],
      });
      expect(response).toBe('0x');
    });

    test('eth_signTypedData', async () => {
      const response = await provider?.request({
        method: 'eth_signTypedData',
        params: [MOCK_ADDERESS, MOCK_TYPED_DATA],
      });
      expect(response).toBe('0x');
    });

    test('wallet_addEthereumChain success', async () => {
      const response = await provider?.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x0539',
            chainName: 'Leet Chain',
            nativeCurrency: 'LEET',
            rpcUrls: ['https://node.ethchain.com'],
            blockExplorerUrls: ['https://leetscan.com'],
            iconUrls: ['https://leetchain.com/icon.svg'],
          },
        ],
      });
      expect(response).toBeNull();
    });

    test('wallet_addEthereumChain missing RPC urls', async () => {
      const response = await provider?.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            rpcUrls: [],
          },
        ],
      });
      expect(response).toBeUndefined();
    });

    test('wallet_addEthereumChain missing chainName', async () => {
      await expect(() => {
        return provider?.request({
          method: 'wallet_addEthereumChain',
          params: [{}],
        });
      }).rejects.toThrowEIPError(
        standardErrorCodes.rpc.invalidParams,
        'chainName is a required field'
      );
    });

    test('wallet_addEthereumChain native currency', async () => {
      await expect(() => {
        return provider?.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x0539',
              chainName: 'Leet Chain',
            },
          ],
        });
      }).rejects.toThrowEIPError(
        standardErrorCodes.rpc.invalidParams,
        'nativeCurrency is a required field'
      );
    });

    test('wallet_switchEthereumChain', async () => {
      const response = await provider?.request({
        method: 'wallet_switchEthereumChain',
        params: [
          {
            chainId: '0x0539',
          },
        ],
      });
      expect(response).toBeNull();
    });

    test('wallet_switchEthereumChain w/ error code', async () => {
      const relay = mockedWalletLinkRelay();
      jest
        .spyOn(relay, 'switchEthereumChain')
        .mockReturnValue(Promise.reject(standardErrors.provider.unsupportedChain()));
      const localProvider = createAdapter({ relay });

      await expect(() => {
        return localProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [
            {
              chainId: '0x0539',
            },
          ],
        });
      }).rejects.toThrowEIPError(
        standardErrorCodes.provider.unsupportedChain,
        expect.stringContaining('Unrecognized chain ID')
      );
    });

    test('wallet_watchAsset', async () => {
      const response = await provider?.request({
        method: 'wallet_watchAsset',
        params: [
          {
            type: 'ERC20',
            options: {
              address: '0xAdD4e55',
            },
          },
        ],
      });
      expect(response).toBe(true);
    });

    test('wallet_watchAsset w/o valid params', async () => {
      await expect(
        () =>
          provider?.request({
            method: 'wallet_watchAsset',
            params: [{}],
          })
      ).rejects.toThrowEIPError(standardErrorCodes.rpc.invalidParams, 'Type is required');
    });

    test('wallet_watchAsset w/o valid asset type', async () => {
      await expect(
        () =>
          provider?.request({
            method: 'wallet_watchAsset',
            params: [
              {
                type: 'ERC721',
              },
            ],
          })
      ).rejects.toThrowEIPError(
        standardErrorCodes.rpc.invalidParams,
        "Asset of type 'ERC721' is not supported"
      );
    });

    test('wallet_watchAsset to throw option required error', async () => {
      await expect(
        () =>
          provider?.request({
            method: 'wallet_watchAsset',
            params: [
              {
                type: 'ERC20',
              },
            ],
          })
      ).rejects.toThrowEIPError(standardErrorCodes.rpc.invalidParams, 'Options are required');
    });

    test('wallet_watchAsset to throw address required error', async () => {
      await expect(
        () =>
          provider?.request({
            method: 'wallet_watchAsset',
            params: [
              {
                type: 'ERC20',
                options: {},
              },
            ],
          })
      ).rejects.toThrowEIPError(standardErrorCodes.rpc.invalidParams, 'Address is required');
    });
  });
});
