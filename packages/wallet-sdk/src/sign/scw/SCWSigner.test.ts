import { Mock, Mocked, vi } from 'vitest';

import { SCWKeyManager } from './SCWKeyManager.js';
import { SCWSigner } from './SCWSigner.js';
import { Communicator } from ':core/communicator/Communicator.js';
import { CB_KEYS_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { EncryptedData, RPCResponseMessage } from ':core/message/RPCMessage.js';
import { AppMetadata, ProviderEventCallback, RequestArguments } from ':core/provider/interface.js';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';
import {
  decryptContent,
  encryptContent,
  exportKeyToHexString,
  importKeyFromHexString,
} from ':util/cipher.js';
import { fetchRPCRequest } from ':util/provider.js';

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

const storageStoreSpy = vi.spyOn(ScopedLocalStorage.prototype, 'storeObject');
const storageClearSpy = vi.spyOn(ScopedLocalStorage.prototype, 'clear');
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
    storageStoreSpy.mockReset();

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

      await signer.handshake({ method: 'eth_requestAccounts' });

      expect(importKeyFromHexString).toHaveBeenCalledWith('public', '0xPublicKey');
      expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(mockCryptoKey);
      expect(decryptContent).toHaveBeenCalledWith(encryptedData, mockCryptoKey);

      expect(storageStoreSpy).toHaveBeenCalledWith('availableChains', [
        { id: 1, rpcUrl: 'https://eth-rpc.example.com/1' },
        { id: 2, rpcUrl: 'https://eth-rpc.example.com/2' },
      ]);
      expect(storageStoreSpy).toHaveBeenCalledWith('walletCapabilities', mockCapabilities);
      expect(storageStoreSpy).toHaveBeenCalledWith('accounts', ['0xAddress']);

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

      expect(storageStoreSpy).not.toHaveBeenCalled();
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
      vi.spyOn(ScopedLocalStorage.prototype, 'loadObject').mockImplementation((key) => {
        switch (key) {
          case 'accounts':
            return ['0xAddress'];
          case 'activeChain':
            return { id: 1, rpcUrl: 'https://eth-rpc.example.com/1' };
          default:
            return null;
        }
      });
    });

    afterAll(() => {
      vi.spyOn(ScopedLocalStorage.prototype, 'loadObject').mockRestore();
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

      await signer.request(mockRequest);

      expect(storageStoreSpy).toHaveBeenCalledWith('availableChains', [
        { id: 1, rpcUrl: 'https://eth-rpc.example.com/1' },
        { id: 2, rpcUrl: 'https://eth-rpc.example.com/2' },
      ]);
      expect(storageStoreSpy).toHaveBeenCalledWith('walletCapabilities', mockCapabilities);
      expect(mockCallback).toHaveBeenCalledWith('chainChanged', '0x1');
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await signer.cleanup();

      expect(storageClearSpy).toHaveBeenCalled();
      expect(mockKeyManager.clear).toHaveBeenCalled();
      expect(signer['accounts']).toEqual([]);
      expect(signer['chain']).toEqual({ id: 1 });
    });
  });

  describe('SCWSigner - wallet_connect', () => {
    beforeEach(async () => {
      await signer.cleanup();
    });

    it('should update internal state for successful wallet_connect', async () => {
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

      expect(storageStoreSpy).toHaveBeenCalledWith('accounts', [
        '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
      ]);
      expect(mockCallback).toHaveBeenCalledWith('accountsChanged', [
        '0xe6c7D51b0d5ECC217BE74019447aeac4580Afb54',
        '0x7838d2724FC686813CAf81d4429beff1110c739a',
      ]);

      await signer.cleanup();
    });
  });
});
