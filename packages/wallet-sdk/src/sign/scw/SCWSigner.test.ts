import { Mock, Mocked, vi } from 'vitest';

import { Communicator } from ':core/communicator/Communicator.js';
import { CB_KEYS_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { EncryptedData, RPCResponseMessage } from ':core/message/RPCMessage.js';
import { AppMetadata, ProviderEventCallback, RequestArguments } from ':core/provider/interface.js';
import { getClient } from ':store/chain-clients/utils.js';
import { store } from ':store/store.js';
import {
  decryptContent,
  encryptContent,
  exportKeyToHexString,
  importKeyFromHexString,
} from ':util/cipher.js';
import { fetchRPCRequest } from ':util/provider.js';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { getCode } from 'viem/actions';
import { waitForCallsStatus } from 'viem/experimental';
import { SCWKeyManager } from './SCWKeyManager.js';
import { SCWSigner } from './SCWSigner.js';
import { getOwnerIndex } from './utils/getOwnerIndex.js';

vi.mock(':util/provider');
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
vi.mock('viem/actions', () => ({
  getCode: vi.fn().mockResolvedValue('0x123'),
  readContract: vi.fn().mockResolvedValue('0x123'),
}));
vi.mock('viem/experimental', () => ({
  waitForCallsStatus: vi.fn(),
}));
vi.mock('./utils/createSubAccountSigner.js', () => ({
  createSubAccountSigner: vi.fn().mockResolvedValue({
    request: vi.fn().mockResolvedValue('0x123'),
  }),
}));
vi.mock('./utils/getOwnerIndex.js', () => ({
  getOwnerIndex: vi.fn(),
}));
vi.mock(':store/chain-clients/utils.js', () => ({
  getClient: vi.fn().mockReturnValue({
    getCode: vi.fn().mockResolvedValue('0x123'),
    test: 'test',
  }),
  createClients: vi.fn(),
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

  afterEach(() => {
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
    beforeAll(() => {
      vi.spyOn(store, 'getState').mockImplementation(() => ({
        account: {
          accounts: ['0xAddress'],
          chain: { id: 1, rpcUrl: 'https://eth-rpc.example.com/1' },
        },
        chains: [],
        keys: {},
        config: {
          metadata: mockMetadata,
          preference: { keysUrl: CB_KEYS_URL, options: 'all' },
          version: '1.0.0',
        },
        subAccountConfig: undefined,
      }));
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

  describe('SCWSigner - wallet_connect', () => {
    it('should update internal state for successful wallet_connect', async () => {
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
                address: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
                capabilities: {
                  addSubAccount: {
                    address: '0x7838d2724FC686813CAf81d4429beff1110c739a',
                    factory: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
                    factoryData: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
                  },
                },
              },
            ],
          },
        },
      });

      await signer.request(mockRequest);

      expect(mockSetAccount).toHaveBeenCalledWith({
        accounts: ['0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54'],
      });
      expect(mockCallback).toHaveBeenCalledWith('accountsChanged', [
        '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
        '0x7838d2724FC686813CAf81d4429beff1110c739a',
      ]);

      await signer.cleanup();
    });
  });

  describe('Auto sub account', () => {
    it('should create a sub account when eth_requestAccounts is called and enableAutoSubAccounts is true', async () => {
      await signer.cleanup();

      vi.spyOn(store.subAccountsConfig, 'get').mockReturnValue({
        enableAutoSubAccounts: true,
      });

      const mockRequest: RequestArguments = {
        method: 'eth_requestAccounts',
        params: [],
      };

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: null,
        },
      });

      await signer.handshake({ method: 'handshake' });
      expect(signer['accounts']).toEqual([]);

      const subAccountAddress = '0x7838d2724FC686813CAf81d4429beff1110c739a';

      (decryptContent as Mock).mockResolvedValueOnce({
        result: {
          value: {
            accounts: [
              {
                address: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
                capabilities: {
                  addSubAccount: {
                    address: subAccountAddress,
                    factory: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
                    factoryData: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
                  },
                },
              },
            ],
          },
        },
      });

      const accounts = await signer.request(mockRequest);

      expect(accounts).toContain(subAccountAddress);
    });

    it("should add the owner account as an owner if it's not already an owner on request", async () => {
      await signer.cleanup();

      vi.spyOn(store.subAccountsConfig, 'get').mockReturnValue({
        enableAutoSubAccounts: true,
      });

      const randomAccount = privateKeyToAccount(generatePrivateKey());

      // Mock subaccount store
      vi.spyOn(store.subAccounts, 'get').mockReturnValue({
        address: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
        factory: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
        factoryData: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
        ownerIndex: undefined,
        owner: {
          address: randomAccount.address,
          type: 'local',
          publicKey: randomAccount.address,
          signMessage: vi.fn(),
          signTransaction: vi.fn(),
          signTypedData: vi.fn(),
          source: 'test',
        },
      });

      const spy = vi
        .spyOn(signer as any, 'sendRequestToPopup')
        .mockImplementationOnce(vi.fn().mockResolvedValue('some-id'));

      (getCode as Mock).mockResolvedValue('0x123');

      (waitForCallsStatus as Mock).mockResolvedValueOnce({
        status: 'success',
      });

      (getOwnerIndex as Mock).mockResolvedValueOnce(3);

      (getClient as Mock).mockReturnValue({
        getCode: vi.fn().mockResolvedValue('0x123'),
      } as any);

      await signer.request({
        method: 'eth_sendTransaction',
        params: [
          {
            to: '0x7838d2724FC686813CAf81d4429beff1110c739a',
            from: '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
            data: '0x123',
            value: '0x0',
          },
        ],
      });

      expect(spy).toHaveBeenCalled();
    });
  });
});
