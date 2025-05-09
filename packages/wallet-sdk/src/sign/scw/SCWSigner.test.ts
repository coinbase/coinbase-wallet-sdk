import { Mock, MockInstance, Mocked, vi } from 'vitest';

import { Communicator } from ':core/communicator/Communicator.js';
import { CB_KEYS_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { EncryptedData, RPCResponseMessage } from ':core/message/RPCMessage.js';
import { AppMetadata, ProviderEventCallback, RequestArguments } from ':core/provider/interface.js';
import { SpendLimit } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { getClient } from ':store/chain-clients/utils.js';
import { store } from ':store/store.js';
import {
  decryptContent,
  encryptContent,
  exportKeyToHexString,
  importKeyFromHexString,
} from ':util/cipher.js';
import { fetchRPCRequest } from ':util/provider.js';
import { HttpRequestError, numberToHex } from 'viem';
import { SCWKeyManager } from './SCWKeyManager.js';
import { SCWSigner } from './SCWSigner.js';
import { createSubAccountSigner } from './utils/createSubAccountSigner.js';
import { findOwnerIndex } from './utils/findOwnerIndex.js';
import { handleAddSubAccountOwner } from './utils/handleAddSubAccountOwner.js';
import { handleInsufficientBalanceError } from './utils/handleInsufficientBalance.js';

vi.mock(':store/chain-clients/utils.js', () => ({
  getBundlerClient: vi.fn().mockReturnValue({}),
  getClient: vi.fn().mockReturnValue({
    request: vi.fn(),
    chain: {
      id: 84532,
    },
    waitForTransaction: vi.fn().mockResolvedValue({
      status: 'success',
    }),
  }),
  createClients: vi.fn(),
}));

vi.mock('./utils/handleInsufficientBalance.js', () => ({
  handleInsufficientBalanceError: vi.fn(),
}));
vi.mock(':util/provider');
vi.mock(':store/chain-clients/utils');
vi.mock('./SCWKeyManager');
vi.mock(':core/communicator/Communicator', () => ({
  Communicator: vi.fn(() => ({
    postRequestAndWaitForResponse: vi.fn(),
    waitForPopupLoaded: vi.fn(),
  })),
}));
vi.mock(':util/cipher', () => ({
  decryptContent: vi.fn(),
  encryptContent: vi.fn(),
  exportKeyToHexString: vi.fn(),
  importKeyFromHexString: vi.fn(),
}));

vi.mock('./utils/handleAddSubAccountOwner.js', () => ({
  handleAddSubAccountOwner: vi.fn(),
}));

vi.mock('./utils/findOwnerIndex.js', () => ({
  findOwnerIndex: vi.fn().mockResolvedValue(1),
}));
vi.mock('./utils/createSubAccountSigner.js', () => ({
  createSubAccountSigner: vi.fn().mockResolvedValue({
    request: vi.fn().mockResolvedValue('0xSignature'),
  }),
}));

const mockCryptoKey = {} as CryptoKey;
const encryptedData = {} as EncryptedData;
const mockChains = {
  '1': 'https://eth-rpc.example.com/1',
  '2': 'https://eth-rpc.example.com/2',
};
const mockCapabilities = {};

const mockError = standardErrors.provider.unauthorized();
const mockSuccessResponse: RPCResponseMessage = {
  id: '1-2-3-4-5',
  requestId: '1-2-3-4-5',
  sender: '0xPublicKey',
  content: { encrypted: encryptedData },
  timestamp: new Date(),
};
const subAccountAddress = '0x7838d2724FC686813CAf81d4429beff1110c739a';
const globalAccountAddress = '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54';

describe('SCWSigner', () => {
  let signer: SCWSigner;
  let mockMetadata: AppMetadata;
  let mockCommunicator: Mocked<Communicator>;
  let mockCallback: ProviderEventCallback;
  let mockKeyManager: Mocked<SCWKeyManager>;

  beforeEach(async () => {
    mockMetadata = {
      appName: 'test',
      appLogoUrl: null,
      appChainIds: [1],
    };

    mockCommunicator = new Communicator({
      url: CB_KEYS_URL,
      metadata: mockMetadata,
      preference: { keysUrl: CB_KEYS_URL, options: 'all' },
    }) as Mocked<Communicator>;

    mockCommunicator.waitForPopupLoaded.mockResolvedValue({} as Window);
    mockCommunicator.postRequestAndWaitForResponse.mockResolvedValue(mockSuccessResponse);

    mockCallback = vi.fn();
    mockKeyManager = new SCWKeyManager() as Mocked<SCWKeyManager>;
    (SCWKeyManager as Mock).mockImplementation(() => mockKeyManager);

    (importKeyFromHexString as Mock).mockResolvedValue(mockCryptoKey);
    (exportKeyToHexString as Mock).mockResolvedValueOnce('0xPublicKey');
    mockKeyManager.getSharedSecret.mockResolvedValue(mockCryptoKey);
    (encryptContent as Mock).mockResolvedValueOnce(encryptedData);

    signer = new SCWSigner({
      metadata: mockMetadata,
      communicator: mockCommunicator,
      callback: mockCallback,
    });
  });

  afterEach(async () => {
    vi.clearAllMocks();

    store.account.clear();
    store.chains.clear();
    store.setState({});
  });

  describe('handshake', () => {
    it('should perform a successful handshake for eth_requestAccounts', async () => {
      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: ['0xAddress'],
        },
        data: {
          chains: mockChains,
          capabilities: mockCapabilities,
        },
      });

      const mockSetChains = vi.spyOn(store.chains, 'set');
      const mockSetAccount = vi.spyOn(store.account, 'set');

      await signer.handshake({ method: 'eth_requestAccounts' });

      expect(importKeyFromHexString).toHaveBeenCalledWith('public', '0xPublicKey');
      expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(mockCryptoKey);
      expect(decryptContent).toHaveBeenCalledWith(encryptedData, mockCryptoKey);

      expect(mockSetChains).toHaveBeenCalledWith([
        { id: 1, rpcUrl: 'https://eth-rpc.example.com/1' },
        { id: 2, rpcUrl: 'https://eth-rpc.example.com/2' },
      ]);
      expect(mockSetAccount).toHaveBeenNthCalledWith(1, {
        chain: {
          id: 1,
          rpcUrl: 'https://eth-rpc.example.com/1',
        },
      });
      expect(mockSetAccount).toHaveBeenNthCalledWith(2, {
        capabilities: mockCapabilities,
      });

      await expect(signer.request({ method: 'eth_requestAccounts' })).resolves.toEqual([
        '0xAddress',
      ]);
      expect(mockCallback).toHaveBeenCalledWith('accountsChanged', ['0xAddress']);
      expect(mockCallback).toHaveBeenCalledWith('connect', { chainId: '0x1' });
    });

    it('should perform a successful handshake for handshake', async () => {
      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: null,
        },
      });

      const mockSetAccount = vi.spyOn(store.account, 'set');

      await signer.handshake({ method: 'handshake' });

      expect(importKeyFromHexString).toHaveBeenCalledWith('public', '0xPublicKey');
      expect(mockCommunicator.postRequestAndWaitForResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          sender: '0xPublicKey',
          content: {
            handshake: expect.objectContaining({
              method: 'handshake',
            }),
          },
        })
      );
      expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(mockCryptoKey);
      expect(decryptContent).toHaveBeenCalledWith(encryptedData, mockCryptoKey);

      expect(mockSetAccount).not.toHaveBeenCalled();
    });

    it('should throw an error if failure in response.content', async () => {
      const mockResponse: RPCResponseMessage = {
        id: '1-2-3-4-5',
        requestId: '1-2-3-4-5',
        sender: '0xPublicKey',
        content: { failure: mockError },
        timestamp: new Date(),
      };
      mockCommunicator.postRequestAndWaitForResponse.mockResolvedValue(mockResponse);

      await expect(signer.handshake({ method: 'eth_requestAccounts' })).rejects.toThrowError(
        mockError
      );
    });
  });

  describe('request - ephemeral signer', () => {
    it.each(['wallet_sendCalls'])(
      'should perform a successful request after handshake',
      async (method) => {
        const mockRequest: RequestArguments = { method };
        (decryptContent as Mock).mockResolvedValueOnce({
          result: {
            value: null,
          },
        });

        await signer.handshake({ method: 'handshake' });
        expect(signer['accounts']).toEqual([]);

        (decryptContent as Mock).mockResolvedValueOnce({
          result: {
            value: '0xSignature',
          },
        });
        (exportKeyToHexString as Mock).mockResolvedValueOnce('0xPublicKey');

        const result = await signer.request(mockRequest);

        expect(encryptContent).toHaveBeenCalled();
        expect(mockCommunicator.postRequestAndWaitForResponse).toHaveBeenNthCalledWith(
          2,
          expect.objectContaining({
            sender: '0xPublicKey',
            content: { encrypted: encryptedData },
          })
        );
        expect(result).toEqual('0xSignature');
      }
    );
  });

  describe('request', () => {
    let stateSpy: MockInstance;

    beforeAll(() => {
      stateSpy = vi.spyOn(store, 'getState').mockImplementation(() => ({
        account: {
          accounts: ['0xAddress'],
          chain: { id: 1, rpcUrl: 'https://eth-rpc.example.com/1' },
        },
        chains: [],
        keys: {},
        spendLimits: {},
        config: {
          metadata: mockMetadata,
          preference: { keysUrl: CB_KEYS_URL, options: 'all' },
          version: '1.0.0',
        },
        subAccountConfig: undefined,
      }));
    });

    afterAll(() => {
      // For some reason vi.restoreAllMocks() doesn't work for this spy
      stateSpy.mockRestore();
    });

    it('should perform a successful request', async () => {
      const mockRequest: RequestArguments = {
        method: 'personal_sign',
        params: ['0xMessage', '0xAddress'],
      };

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: '0xSignature',
        },
      });

      const result = await signer.request(mockRequest);

      expect(encryptContent).toHaveBeenCalled();
      expect(mockCommunicator.postRequestAndWaitForResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          sender: '0xPublicKey',
          content: { encrypted: encryptedData },
        })
      );
      expect(result).toEqual('0xSignature');
    });

    it.each([
      'eth_ecRecover',
      'personal_sign',
      'wallet_sign',
      'personal_ecRecover',
      'eth_signTransaction',
      'eth_sendTransaction',
      'eth_signTypedData_v1',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4',
      'eth_signTypedData',
      'wallet_addEthereumChain',
      'wallet_watchAsset',
      'wallet_sendCalls',
      'wallet_showCallsStatus',
      'wallet_grantPermissions',
    ])('should send request to popup for %s', async (method) => {
      const mockRequest: RequestArguments = {
        method,
        params: [],
      };

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: '0xSignature',
        },
      });

      await signer.request(mockRequest);

      expect(mockCommunicator.postRequestAndWaitForResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          sender: '0xPublicKey',
          content: { encrypted: encryptedData },
        })
      );
    });

    it.each([
      'wallet_prepareCalls',
      'wallet_sendPreparedCalls',
      'eth_getBalance',
      'eth_getTransactionCount',
    ])('should fetch rpc request for %s', async (method) => {
      const mockRequest: RequestArguments = {
        method,
        params: [],
      };

      await signer.request(mockRequest);

      expect(fetchRPCRequest).toHaveBeenCalledWith(mockRequest, 'https://eth-rpc.example.com/1');
    });

    it('should throw an error if error in decrypted response', async () => {
      const mockRequest: RequestArguments = {
        method: 'personal_sign',
        params: ['0xMessage', '0xAddress'],
      };

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          error: mockError,
        },
      });

      await expect(signer.request(mockRequest)).rejects.toThrowError(mockError);
    });

    it('should update internal state for successful wallet_switchEthereumChain', async () => {
      const mockRequest: RequestArguments = {
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1' }],
      };

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: null,
        },
        data: {
          chains: mockChains,
          capabilities: mockCapabilities,
        },
      });

      const mockSetChains = vi.spyOn(store.chains, 'set');
      const mockSetAccount = vi.spyOn(store.account, 'set');

      await signer.request(mockRequest);

      expect(mockSetChains).toHaveBeenCalledWith([
        { id: 1, rpcUrl: 'https://eth-rpc.example.com/1' },
        { id: 2, rpcUrl: 'https://eth-rpc.example.com/2' },
      ]);
      expect(mockSetAccount).toHaveBeenNthCalledWith(1, {
        chain: { id: 1, rpcUrl: 'https://eth-rpc.example.com/1' },
      });
      expect(mockSetAccount).toHaveBeenNthCalledWith(2, {
        capabilities: mockCapabilities,
      });
      expect(mockCallback).toHaveBeenCalledWith('chainChanged', '0x1');
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      const mockClear = vi.spyOn(store.account, 'clear');

      await signer.cleanup();

      expect(mockClear).toHaveBeenCalled();
      expect(mockKeyManager.clear).toHaveBeenCalled();
      expect(signer['accounts']).toEqual([]);
      expect(signer['chain']).toEqual({ id: 1 });
    });
  });

  describe('wallet_connect', () => {
    beforeEach(async () => {
      await signer.cleanup();
      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: null,
        },
      });
      await signer.handshake({ method: 'handshake' });
    });

    it('should handle wallet_connect with no capabilities', async () => {
      expect(signer['accounts']).toEqual([]);
      const mockRequest: RequestArguments = {
        method: 'wallet_connect',
        params: [],
      };

      const mockSetAccount = vi.spyOn(store.account, 'set');
      const mockSetSubAccounts = vi.spyOn(store.subAccounts, 'set');

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            accounts: [
              {
                address: globalAccountAddress,
                capabilities: {
                  subAccounts: [
                    {
                      address: subAccountAddress,
                      factory: globalAccountAddress,
                      factoryData: '0x',
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      await signer.request(mockRequest);

      // Should only persist global account to accounts store
      expect(mockSetAccount).toHaveBeenCalledWith({
        accounts: [globalAccountAddress],
      });

      // Should persist sub account to subAccounts store
      expect(mockSetSubAccounts).toHaveBeenCalledWith({
        address: subAccountAddress,
        factory: globalAccountAddress,
        factoryData: '0x',
      });

      // eth_accounts should return only global account
      const accounts = await signer.request({ method: 'eth_accounts' });
      expect(accounts).toEqual([globalAccountAddress]);
    });

    it('should handle wallet_connect with addSubAccount capability', async () => {
      expect(signer['accounts']).toEqual([]);
      const mockRequest: RequestArguments = {
        method: 'wallet_connect',
        params: [
          {
            capabilities: {
              addSubAccount: {
                account: {
                  type: 'create',
                  keys: [{ type: 'p256', publicKey: '0x123' }],
                },
              },
            },
          },
        ],
      };

      const mockSetAccount = vi.spyOn(store.account, 'set');
      const mockSetSubAccounts = vi.spyOn(store.subAccounts, 'set');

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            accounts: [
              {
                address: globalAccountAddress,
                capabilities: {
                  subAccounts: [
                    {
                      address: subAccountAddress,
                      factory: globalAccountAddress,
                      factoryData: '0x',
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      await signer.request(mockRequest);

      // Should persist global account to accounts store
      expect(mockSetAccount).toHaveBeenCalledWith({
        accounts: [globalAccountAddress],
      });

      // Should persist sub account to subAccounts store
      expect(mockSetSubAccounts).toHaveBeenCalledWith({
        address: subAccountAddress,
        factory: globalAccountAddress,
        factoryData: '0x',
      });

      // eth_accounts should return [subAccount, globalAccount]
      const accounts = await signer.request({ method: 'eth_accounts' });

      expect(accounts).toEqual([subAccountAddress, globalAccountAddress]);
    });

    it('should handle wallet_addSubAccount creating new sub account', async () => {
      expect(signer['accounts']).toEqual([]);

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            accounts: [
              {
                address: globalAccountAddress,
                capabilities: {},
              },
            ],
          },
        },
      });

      // First connect without sub account
      await signer.request({
        method: 'wallet_connect',
        params: [],
      });

      const mockSetSubAccounts = vi.spyOn(store.subAccounts, 'set');

      // Then add sub account
      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            address: subAccountAddress,
            factory: globalAccountAddress,
            factoryData: '0x',
          },
        },
      });

      await signer.request({
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

      // Should persist sub account to subAccounts store
      expect(mockSetSubAccounts).toHaveBeenCalledWith({
        address: subAccountAddress,
        factory: globalAccountAddress,
        factoryData: '0x',
      });

      // eth_accounts should return [subAccount, globalAccount]
      const accounts = await signer.request({ method: 'eth_accounts' });
      expect(accounts).toEqual([subAccountAddress, globalAccountAddress]);
    });

    it('should handle eth_requestAccounts with auto sub accounts enabled', async () => {
      expect(signer['accounts']).toEqual([]);
      vi.spyOn(store.subAccountsConfig, 'get').mockReturnValue({
        enableAutoSubAccounts: true,
        capabilities: {
          addSubAccount: {
            account: {
              type: 'create',
              keys: [{ type: 'p256', publicKey: '0x123' }],
            },
          },
        },
      });

      const mockSetAccount = vi.spyOn(store.account, 'set');
      const mockSetSubAccounts = vi.spyOn(store.subAccounts, 'set');

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            accounts: [
              {
                address: globalAccountAddress,
                capabilities: {
                  subAccounts: [
                    {
                      address: subAccountAddress,
                      factory: globalAccountAddress,
                      factoryData: '0x',
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      const accounts = await signer.request({
        method: 'eth_requestAccounts',
        params: [],
      });

      // Should persist global account to accounts store
      expect(mockSetAccount).toHaveBeenCalledWith({
        accounts: [globalAccountAddress],
      });

      // Should persist sub account to subAccounts store
      expect(mockSetSubAccounts).toHaveBeenCalledWith({
        address: subAccountAddress,
        factory: globalAccountAddress,
        factoryData: '0x',
      });

      // Should return [subAccount, globalAccount]
      expect(accounts).toEqual([subAccountAddress, globalAccountAddress]);

      // eth_accounts should also return [subAccount, globalAccount]
      const ethAccounts = await signer.request({ method: 'eth_accounts' });
      expect(ethAccounts).toEqual([subAccountAddress, globalAccountAddress]);
    });
  });

  describe('wallet_addSubAccount', () => {
    it('should update internal state for successful wallet_addSubAccount', async () => {
      await signer.cleanup();

      const mockRequest: RequestArguments = {
        method: 'wallet_connect',
        params: [],
      };

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: null,
        },
      });
      const mockSetAccount = vi.spyOn(store.account, 'set');

      await signer.handshake({ method: 'handshake' });
      expect(signer['accounts']).toEqual([]);

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            accounts: [
              {
                address: globalAccountAddress,
                capabilities: {},
              },
            ],
          },
        },
      });

      await signer.request(mockRequest);

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            address: subAccountAddress,
            factory: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
            factoryData: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
          },
        },
      });

      await signer.request({
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

      const accounts = await signer.request({ method: 'eth_accounts' });
      expect(accounts).toEqual([subAccountAddress, globalAccountAddress]);

      expect(mockSetAccount).toHaveBeenCalledWith({
        accounts: [globalAccountAddress],
      });
    });

    it('should fall back to local account if no keys are provided', async () => {
      await signer.cleanup();

      const mockRequest: RequestArguments = {
        method: 'wallet_connect',
        params: [],
      };

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: null,
        },
      });

      await signer.handshake({ method: 'handshake' });
      expect(signer['accounts']).toEqual([]);

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            accounts: [
              {
                address: globalAccountAddress,
                capabilities: {},
              },
            ],
          },
        },
      });

      await signer.request(mockRequest);

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            address: subAccountAddress,
            factory: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
            factoryData: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
          },
        },
      });

      await signer.request({
        method: 'wallet_addSubAccount',
        params: [
          {
            version: '1',
            account: {
              type: 'create',
            },
          },
        ],
      });

      const accounts = await signer.request({ method: 'eth_accounts' });
      expect(accounts).toEqual([subAccountAddress, globalAccountAddress]);
    });
  });

  describe('auto sub account', () => {
    beforeEach(async () => {
      await signer.cleanup();

      (getClient as Mock).mockReturnValue({
        getChainId: vi.fn().mockReturnValue(84532),
        waitForTransaction: vi.fn().mockResolvedValue({
          status: 'success',
        }),
      });

      vi.spyOn(store.subAccountsConfig, 'get').mockReturnValue({
        enableAutoSubAccounts: true,
      });

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: null,
        },
      });

      await signer.handshake({ method: 'handshake' });

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            accounts: [
              {
                address: globalAccountAddress,
                capabilities: {
                  subAccounts: [
                    {
                      address: subAccountAddress,
                      factory: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
                      factoryData: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
                    },
                  ],
                },
              },
            ],
          },
        },
      });
    });

    it('should create a sub account when eth_requestAccounts is called', async () => {
      const mockRequest: RequestArguments = {
        method: 'eth_requestAccounts',
        params: [],
      };

      const accounts = await signer.request(mockRequest);
      expect(accounts).toContain(subAccountAddress);
    });

    it('update the owner index for the sub account', async () => {
      await signer.cleanup();

      store.subAccounts.set({
        address: '0x7838d2724FC686813CAf81d4429beff1110c739a',
      });

      (findOwnerIndex as Mock).mockResolvedValueOnce(-1);
      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: null,
        },
      });

      await signer.handshake({ method: 'handshake' });
      expect(signer['accounts']).toEqual([]);

      signer['accounts'] = [
        '0x7838d2724FC686813CAf81d4429beff1110c739a',
        '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
      ];

      const mockRequest: RequestArguments = {
        method: 'wallet_sendCalls',
        params: [
          {
            to: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
            version: '1',
            calls: [],
            from: '0x7838d2724FC686813CAf81d4429beff1110c739a',
          },
        ],
      };

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            accounts: [
              {
                address: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
                capabilities: {
                  subAccounts: [
                    {
                      address: '0x7838d2724FC686813CAf81d4429beff1110c739a',
                      factory: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
                      factoryData: '0x',
                    },
                  ],
                },
              },
            ],
          },
        },
      });

      await signer.request(mockRequest);

      expect(handleAddSubAccountOwner).toHaveBeenCalled();
    });

    it('should handle insufficient balance error if external funding source is present', async () => {
      vi.spyOn(store.subAccountsConfig, 'get').mockReturnValue({
        enableAutoSubAccounts: true,
        dynamicSpendLimits: true,
      });

      (createSubAccountSigner as Mock).mockImplementation(async () => {
        const request = vi.fn((args) => {
          throw new HttpRequestError({
            body: args,
            url: 'https://eth-rpc.example.com/1',
            details: JSON.stringify({
              code: -32090,
              message: 'transfer amount exceeds balance',
              data: {
                type: 'INSUFFICIENT_FUNDS',
                reason: 'NO_SUITABLE_SPEND_PERMISSION_FOUND',
                account: {
                  address: subAccountAddress,
                },
                required: {
                  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': {
                    amount: '0x38d7ea4c68000',
                    sources: [
                      {
                        address: globalAccountAddress,
                        balance: '0x1d73b609302000',
                      },
                    ],
                  },
                },
              },
            }),
          });
        });

        return {
          request,
        };
      });

      await signer.request({
        method: 'eth_requestAccounts',
        params: [],
      });

      const mockRequest: RequestArguments = {
        method: 'wallet_sendCalls',
        params: [
          {
            calls: [
              {
                to: '0x',
                value: '0x0',
                data: '0x',
              },
            ],
            chainId: numberToHex(84532),
            from: subAccountAddress,
            version: '1.0',
          },
        ],
      };

      signer = new SCWSigner({
        metadata: mockMetadata,
        communicator: mockCommunicator,
        callback: mockCallback,
      });

      await signer.request(mockRequest);

      expect(handleInsufficientBalanceError).toHaveBeenCalled();

      (createSubAccountSigner as Mock).mockRestore();
    });
  });

  describe('coinbase_fetchPermissions', () => {
    const mockSpendLimits = [
      {
        permissionHash: '0xPermissionHash',
        signature: '0xSignature',
        permission: {
          account: '0xAddress',
          spender: '0xSubAccount',
        },
      },
    ] as [SpendLimit];

    beforeEach(() => {
      vi.spyOn(store, 'getState').mockImplementation(() => ({
        account: {
          accounts: ['0xAddress'],
          chain: { id: 10, rpcUrl: 'https://eth-rpc.example.com/10' },
        },
        subAccount: {
          address: '0xSubAccount',
        },
        chains: [],
        keys: {},
        spendLimits: {},
        config: {
          metadata: mockMetadata,
          preference: { keysUrl: CB_KEYS_URL, options: 'all' },
          version: '1.0.0',
        },
      }));

      (fetchRPCRequest as Mock).mockResolvedValue({
        permissions: mockSpendLimits,
      });
    });

    it('should update internal state for successful coinbase_fetchPermissions', async () => {
      await signer.cleanup();

      const mockRequest: RequestArguments = {
        method: 'coinbase_fetchPermissions',
      };

      signer['accounts'] = ['0xAddress']; // mock the logged in state

      const mockSetSpendLimits = vi.spyOn(store.spendLimits, 'set');

      await signer.request(mockRequest);

      expect(mockSetSpendLimits).toHaveBeenCalledWith({
        '10': mockSpendLimits,
      });
    });
  });
});
