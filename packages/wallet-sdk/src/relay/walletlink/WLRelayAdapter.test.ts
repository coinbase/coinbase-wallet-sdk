import { fireEvent } from '@testing-library/preact';

import { standardErrorCodes, standardErrors } from '../../core/error';
import { AddressString } from '../../core/type';
import { ScopedLocalStorage } from '../../lib/ScopedLocalStorage';
import { MOCK_ADDERESS, MOCK_SIGNED_TX, MOCK_TX, MOCK_TYPED_DATA } from '../../mocks/fixtures';
import { MockRelayClass } from '../../mocks/relay';
import { LOCAL_STORAGE_ADDRESSES_KEY } from '../RelayAbstract';
import { WLRelayAdapter } from './WLRelayAdapter';

jest.mock('./WalletLinkRelay', () => {
  return {
    WalletLinkRelay: MockRelayClass,
  };
});

const storage = new ScopedLocalStorage('LegacyProvider');

const createWLConnectorToRelayAdapter = (options?: {
  relay?: MockRelayClass;
  storage?: ScopedLocalStorage;
}) => {
  const adapter = new WLRelayAdapter({
    appName: 'test',
    appLogoUrl: null,
    storage: options?.storage || storage,
    updateListener: {
      onAccountsChanged: () => {},
      onChainChanged: () => {},
    },
  });
  if (options?.relay) {
    (adapter as any)._relay = options.relay;
  }
  return adapter;
};

describe('LegacyProvider', () => {
  afterEach(() => {
    storage.clear();
  });

  it('handles enabling the provider successfully', async () => {
    const provider = createWLConnectorToRelayAdapter();
    const response = await provider.request<AddressString[]>({ method: 'eth_requestAccounts' });
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it('handles close', async () => {
    const relay = new MockRelayClass();
    const spy = jest.spyOn(relay, 'resetAndReload');

    const provider = createWLConnectorToRelayAdapter({ relay });
    await provider.close();
    expect(spy).toHaveBeenCalled();
  });

  it('handles making a send with a string param', async () => {
    const provider = createWLConnectorToRelayAdapter();
    const response = await provider.send('eth_requestAccounts');
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it('handles making a rpc request', async () => {
    const provider = createWLConnectorToRelayAdapter();
    const response = await provider.request<string[]>({
      method: 'eth_requestAccounts',
    });
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it('handles making a send with a rpc request', async () => {
    const mockCallback = jest.fn();
    const provider = createWLConnectorToRelayAdapter();
    await provider.send(
      {
        jsonrpc: '2.0',
        method: 'eth_requestAccounts',
        params: [],
        id: 1,
      },
      mockCallback
    );

    expect(mockCallback).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        result: [MOCK_ADDERESS.toLowerCase()],
      })
    );
  });

  it('handles making a sendAsync with a string param', async () => {
    const provider = createWLConnectorToRelayAdapter();
    const mockCallback = jest.fn();
    await provider.sendAsync(
      {
        jsonrpc: '2.0',
        method: 'eth_requestAccounts',
        params: [],
        id: 1,
      },
      mockCallback
    );
    expect(mockCallback).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        result: [MOCK_ADDERESS.toLowerCase()],
      })
    );
  });

  it("does NOT update the providers address on a postMessage's 'addressesChanged' event", () => {
    const provider = createWLConnectorToRelayAdapter();

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

  it('handles user rejecting enable call', async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, 'requestEthereumAccounts').mockReturnValue({
      cancel: () => {},
      promise: Promise.reject(new Error('rejected')),
    });
    const provider = createWLConnectorToRelayAdapter({ relay });

    await expect(() => provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowEIPError(
      standardErrorCodes.provider.userRejectedRequest,
      'User denied account authorization'
    );
  });

  it('handles user rejecting enable call with unknown error', async () => {
    const relay = new MockRelayClass();
    jest.spyOn(relay, 'requestEthereumAccounts').mockReturnValue({
      cancel: () => {},
      promise: Promise.reject(new Error('Unknown')),
    });
    const provider = createWLConnectorToRelayAdapter({ relay });

    await expect(() => provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowEIPError(
      standardErrorCodes.rpc.internal,
      'Unknown'
    );
  });

  it('returns the users address on future eth_requestAccounts calls', async () => {
    const provider = createWLConnectorToRelayAdapter();
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
    const localStorage = new ScopedLocalStorage('test');
    localStorage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, MOCK_ADDERESS.toLowerCase());
    const provider = createWLConnectorToRelayAdapter({
      storage: localStorage,
    });

    // @ts-expect-error accessing private value for test
    expect(provider._addresses).toEqual([MOCK_ADDERESS.toLowerCase()]);

    // Set the account on the first request
    const response = await provider.request<string[]>({
      method: 'eth_requestAccounts',
    });
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  describe('RPC Methods', () => {
    let provider: WLRelayAdapter | null = null;
    let localStorage: ScopedLocalStorage;
    beforeEach(() => {
      localStorage = new ScopedLocalStorage('test');
      localStorage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, MOCK_ADDERESS.toLowerCase());
      provider = createWLConnectorToRelayAdapter({
        storage: localStorage,
      });
    });

    afterEach(() => {
      provider = null;
      localStorage?.clear();
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

    // eslint-disable-next-line jest/no-disabled-tests
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
      const relay = new MockRelayClass();

      jest.spyOn(relay, 'switchEthereumChain').mockReturnValue({
        cancel: () => {},
        promise: Promise.reject(standardErrors.provider.unsupportedChain()),
      });
      const localProvider = createWLConnectorToRelayAdapter({ relay });

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
