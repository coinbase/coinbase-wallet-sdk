import { fireEvent } from '@testing-library/preact';
import { vi } from 'vitest';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import eip712 from '../../vendor-js/eth-eip712-util/index.cjs';
import { LOCAL_STORAGE_ADDRESSES_KEY } from './relay/constants.js';
import { MOCK_ADDERESS, MOCK_SIGNED_TX, MOCK_TX, MOCK_TYPED_DATA } from './relay/mocks/fixtures.js';
import { mockedWalletLinkRelay } from './relay/mocks/relay.js';
import { WalletLinkRelay } from './relay/WalletLinkRelay.js';
import { WalletLinkSigner } from './WalletLinkSigner.js';
import { WALLETLINK_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { ProviderEventCallback } from ':core/provider/interface.js';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';
import { Address } from ':core/type/index.js';

vi.mock('./relay/WalletLinkRelay', () => {
  return {
    WalletLinkRelay: mockedWalletLinkRelay,
  };
});

const testStorage = new ScopedLocalStorage('walletlink', WALLETLINK_URL);
const mockCallback: ProviderEventCallback = vi.fn();

const createAdapter = (options?: { relay?: WalletLinkRelay }) => {
  const adapter = new WalletLinkSigner({
    metadata: { appName: 'test', appLogoUrl: null, appChainIds: [1] },
    callback: mockCallback,
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
    const response = (await provider.request({ method: 'eth_requestAccounts' })) as Address[];
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
    expect(mockCallback).toHaveBeenCalledWith('connect', { chainId: '0x1' });
  });

  it('handles close', async () => {
    const relay = mockedWalletLinkRelay();
    const spy = vi.spyOn(relay, 'resetAndReload');

    const provider = createAdapter({ relay });
    await provider.cleanup();
    expect(spy).toHaveBeenCalled();
  });

  it('handles making a rpc request', async () => {
    const provider = createAdapter();
    const response = (await provider.request({
      method: 'eth_requestAccounts',
    })) as Address[];
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
    const response1 = (await provider.request({
      method: 'eth_requestAccounts',
    })) as Address[];
    expect(response1[0]).toBe(MOCK_ADDERESS.toLowerCase());

    // @ts-expect-error accessing private value for test
    expect(provider._addresses).toEqual([MOCK_ADDERESS.toLowerCase()]);

    // Set the account on the first request
    const response2 = (await provider.request({
      method: 'eth_requestAccounts',
    })) as Address[];
    expect(response2[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  it('gets the users address from storage on init', async () => {
    testStorage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, MOCK_ADDERESS.toLowerCase());
    const provider = createAdapter();

    // @ts-expect-error accessing private value for test
    expect(provider._addresses).toEqual([MOCK_ADDERESS.toLowerCase()]);

    // Set the account on the first request
    const response = (await provider.request({
      method: 'eth_requestAccounts',
    })) as Address[];
    expect(response[0]).toBe(MOCK_ADDERESS.toLowerCase());
  });

  describe('ecRecover', () => {
    const relay = mockedWalletLinkRelay();
    const sendRequestSpy = vi.spyOn(relay, 'sendRequest');
    const provider = createAdapter({ relay });

    beforeEach(() => {
      sendRequestSpy.mockResolvedValue({
        result: MOCK_ADDERESS,
      });
    });

    test('eth_ecRecover', async () => {
      const response = await provider?.request({
        method: 'eth_ecRecover',
        params: ['Super safe message', '0x'],
      });
      expect(sendRequestSpy).toBeCalledWith({
        method: 'ethereumAddressFromSignedMessage',
        params: {
          addPrefix: false,
          message: '0x53757065722073616665206d657373616765',
          signature: '0x',
        },
      });
      expect(response).toBe(MOCK_ADDERESS);
    });

    test('personal_ecRecover', async () => {
      const response = await provider?.request({
        method: 'personal_ecRecover',
        params: ['Super safe message', '0x'],
      });
      expect(sendRequestSpy).toBeCalledWith({
        method: 'ethereumAddressFromSignedMessage',
        params: {
          addPrefix: true,
          message: '0x53757065722073616665206d657373616765',
          signature: '0x',
        },
      });
      expect(response).toBe(MOCK_ADDERESS);
    });
  });

  describe('personal_sign', () => {
    testStorage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, MOCK_ADDERESS);
    const relay = mockedWalletLinkRelay();
    const provider = createAdapter({ relay });

    test('personal_sign success', async () => {
      const sendRequestSpy = vi.spyOn(relay, 'sendRequest').mockResolvedValueOnce({
        result: 'mocked result',
      });
      const response = await provider?.request({
        method: 'personal_sign',
        params: ['My secret message', MOCK_ADDERESS],
      });
      expect(sendRequestSpy).toBeCalledWith({
        method: 'signEthereumMessage',
        params: {
          address: MOCK_ADDERESS.toLowerCase(),
          message: '0x4d7920736563726574206d657373616765',
          addPrefix: true,
          typedDataJson: null,
        },
      });
      expect(response).toBe('mocked result');
    });

    test('personal_sign fail', async () => {
      await expect(() =>
        provider?.request({
          method: 'personal_sign',
          params: ['0x123456789abcdef', 'Super safe message'],
        })
      ).rejects.toMatchObject({
        code: standardErrorCodes.rpc.invalidParams,
        message: 'Invalid Ethereum address: Super safe message',
      });
    });
  });

  describe('signTypedData', () => {
    testStorage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, MOCK_ADDERESS);
    const relay = mockedWalletLinkRelay();
    const sendRequestSpy = vi.spyOn(relay, 'sendRequest');
    const provider = createAdapter({ relay });

    const ENCODED_MESSAGE = '0x421b6e328c574f0ee83a68d51d01be3597d8b5391c7725dfa80247a60b5cd390';
    const ENCODED_TYPED_DATA_JSON = JSON.stringify(MOCK_TYPED_DATA);

    beforeEach(() => {
      sendRequestSpy.mockResolvedValue({
        result: 'signTypedData mocked result',
      });
    });

    test.skip('eth_signTypedData_v1', async () => {
      const hashSpy = vi.spyOn(eip712, 'hashForSignTypedDataLegacy');
      const response = await provider?.request({
        method: 'eth_signTypedData_v1',
        params: [[MOCK_TYPED_DATA], MOCK_ADDERESS],
      });
      expect(hashSpy).toHaveBeenCalled();
      expect(sendRequestSpy).toBeCalledWith({
        method: 'signEthereumMessage',
        params: {
          address: MOCK_ADDERESS.toLowerCase(),
          message: ENCODED_MESSAGE,
          addPrefix: false,
          typedDataJson: ENCODED_TYPED_DATA_JSON,
        },
      });
      expect(response).toBe('signTypedData mocked result');
    });

    test('eth_signTypedData_v3', async () => {
      const hashSpy = vi.spyOn(eip712, 'hashForSignTypedData_v3');
      const response = await provider?.request({
        method: 'eth_signTypedData_v3',
        params: [MOCK_ADDERESS, MOCK_TYPED_DATA],
      });
      expect(hashSpy).toHaveBeenCalled();
      expect(sendRequestSpy).toBeCalledWith({
        method: 'signEthereumMessage',
        params: {
          address: MOCK_ADDERESS.toLowerCase(),
          message: ENCODED_MESSAGE,
          addPrefix: false,
          typedDataJson: ENCODED_TYPED_DATA_JSON,
        },
      });
      expect(response).toBe('signTypedData mocked result');
    });

    test('eth_signTypedData_v4', async () => {
      const hashSpy = vi.spyOn(eip712, 'hashForSignTypedData_v4');
      const response = await provider?.request({
        method: 'eth_signTypedData_v4',
        params: [MOCK_ADDERESS, MOCK_TYPED_DATA],
      });
      expect(hashSpy).toHaveBeenCalled();
      expect(sendRequestSpy).toBeCalledWith({
        method: 'signEthereumMessage',
        params: {
          address: MOCK_ADDERESS.toLowerCase(),
          message: ENCODED_MESSAGE,
          addPrefix: false,
          typedDataJson: ENCODED_TYPED_DATA_JSON,
        },
      });
      expect(response).toBe('signTypedData mocked result');
    });

    test('eth_signTypedData', async () => {
      const hashSpy = vi.spyOn(eip712, 'hashForSignTypedData_v4');
      const response = await provider?.request({
        method: 'eth_signTypedData',
        params: [MOCK_ADDERESS, MOCK_TYPED_DATA],
      });
      expect(hashSpy).toHaveBeenCalled();
      expect(sendRequestSpy).toBeCalledWith({
        method: 'signEthereumMessage',
        params: {
          address: MOCK_ADDERESS.toLowerCase(),
          message: ENCODED_MESSAGE,
          addPrefix: false,
          typedDataJson: ENCODED_TYPED_DATA_JSON,
        },
      });
      expect(response).toBe('signTypedData mocked result');
    });
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
      const response = await provider?.request({
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
      const response = provider?.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            rpcUrls: [],
          },
        ],
      });
      await expect(response).rejects.toThrow(
        standardErrors.rpc.invalidParams('please pass in at least 1 rpcUrl')
      );
    });

    test('wallet_addEthereumChain missing chainName', async () => {
      await expect(() => {
        return provider?.request({
          method: 'wallet_addEthereumChain',
          params: [{}],
        });
      }).rejects.toMatchObject({
        code: standardErrorCodes.rpc.invalidParams,
        message: 'chainName is a required field',
      });
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
      }).rejects.toMatchObject({
        code: standardErrorCodes.rpc.invalidParams,
        message: 'nativeCurrency is a required field',
      });
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
      vi.spyOn(relay, 'switchEthereumChain').mockReturnValue(
        Promise.reject(standardErrors.provider.unsupportedChain())
      );
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
      }).rejects.toMatchObject({
        code: standardErrorCodes.provider.unsupportedChain,
        message: expect.stringContaining('Unrecognized chain ID'),
      });
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
      await expect(() =>
        provider?.request({
          method: 'wallet_watchAsset',
          params: [{}],
        })
      ).rejects.toMatchObject({
        code: standardErrorCodes.rpc.invalidParams,
        message: 'Type is required',
      });
    });

    test('wallet_watchAsset w/o valid asset type', async () => {
      await expect(() =>
        provider?.request({
          method: 'wallet_watchAsset',
          params: [
            {
              type: 'ERC721',
            },
          ],
        })
      ).rejects.toMatchObject({
        code: standardErrorCodes.rpc.invalidParams,
        message: "Asset of type 'ERC721' is not supported",
      });
    });

    test('wallet_watchAsset to throw option required error', async () => {
      await expect(() =>
        provider?.request({
          method: 'wallet_watchAsset',
          params: [
            {
              type: 'ERC20',
            },
          ],
        })
      ).rejects.toMatchObject({
        code: standardErrorCodes.rpc.invalidParams,
        message: 'Options are required',
      });
    });

    test('wallet_watchAsset to throw address required error', async () => {
      await expect(() =>
        provider?.request({
          method: 'wallet_watchAsset',
          params: [
            {
              type: 'ERC20',
              options: {},
            },
          ],
        })
      ).rejects.toMatchObject({
        code: standardErrorCodes.rpc.invalidParams,
        message: 'Address is required',
      });
    });
  });
});
