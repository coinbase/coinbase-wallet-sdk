import { StateUpdateListener } from '../interface';
import { SCWKeyManager } from './SCWKeyManager';
import { SCWSigner } from './SCWSigner';
import { Communicator } from ':core/communicator/Communicator';
import { standardErrors } from ':core/error';
import { EncryptedData, RPCResponseMessage } from ':core/message';
import { AppMetadata, RequestArguments } from ':core/provider/interface';
import {
  decryptContent,
  encryptContent,
  exportKeyToHexString,
  importKeyFromHexString,
} from ':util/cipher';
import { ScopedLocalStorage } from ':util/ScopedLocalStorage';

const storageStoreSpy = jest.spyOn(ScopedLocalStorage.prototype, 'storeObject');

jest.mock('./SCWKeyManager');
jest.mock(':core/communicator/Communicator', () => ({
  Communicator: jest.fn(() => ({
    postRequestAndWaitForResponse: jest.fn(),
    waitForPopupLoaded: jest.fn(),
  })),
}));
jest.mock(':util/cipher', () => ({
  decryptContent: jest.fn(),
  encryptContent: jest.fn(),
  exportKeyToHexString: jest.fn(),
  importKeyFromHexString: jest.fn(),
}));

const mockCryptoKey = {} as CryptoKey;
const encryptedData = {} as EncryptedData;
const mockChains = [10];
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
  let mockCommunicator: jest.Mocked<Communicator>;
  let mockUpdateListener: StateUpdateListener;
  let mockKeyManager: jest.Mocked<SCWKeyManager>;

  beforeEach(() => {
    mockMetadata = {
      appName: 'test',
      appLogoUrl: null,
      appChainIds: [1],
    };
    mockCommunicator = new Communicator() as jest.Mocked<Communicator>;
    mockCommunicator.waitForPopupLoaded.mockResolvedValue({} as Window);
    mockCommunicator.postRequestAndWaitForResponse.mockResolvedValue(mockSuccessResponse);
    mockUpdateListener = {
      onAccountsUpdate: jest.fn(),
      onChainUpdate: jest.fn(),
    };
    mockKeyManager = new SCWKeyManager() as jest.Mocked<SCWKeyManager>;
    (SCWKeyManager as jest.Mock).mockImplementation(() => mockKeyManager);
    storageStoreSpy.mockReset();

    (importKeyFromHexString as jest.Mock).mockResolvedValue(mockCryptoKey);
    (exportKeyToHexString as jest.Mock).mockResolvedValueOnce('0xPublicKey');
    mockKeyManager.getSharedSecret.mockResolvedValue(mockCryptoKey);
    (encryptContent as jest.Mock).mockResolvedValueOnce(encryptedData);

    signer = new SCWSigner({
      metadata: mockMetadata,
      communicator: mockCommunicator,
      updateListener: mockUpdateListener,
    });
  });

  describe('handshake', () => {
    it('should perform a successful handshake', async () => {
      (decryptContent as jest.Mock).mockResolvedValueOnce({
        result: {
          value: ['0xAddress'],
        },
        data: {
          chains: mockChains,
          capabilities: mockCapabilities,
        },
      });

      await signer.handshake();

      expect(importKeyFromHexString).toHaveBeenCalledWith('public', '0xPublicKey');
      expect(mockKeyManager.setPeerPublicKey).toHaveBeenCalledWith(mockCryptoKey);
      expect(decryptContent).toHaveBeenCalledWith(encryptedData, mockCryptoKey);

      expect(storageStoreSpy).toHaveBeenCalledWith('availableChains', [{ id: 0, rpcUrl: 10 }]);
      expect(storageStoreSpy).toHaveBeenCalledWith('walletCapabilities', mockCapabilities);
      expect(storageStoreSpy).toHaveBeenCalledWith('accounts', ['0xAddress']);
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

      await expect(signer.handshake()).rejects.toThrowError(mockError);
    });
  });

  describe('request', () => {
    it('should perform a successful request', async () => {
      const mockRequest: RequestArguments = {
        method: 'personal_sign',
        params: ['0xMessage', '0xAddress'],
      };

      (decryptContent as jest.Mock).mockResolvedValueOnce({
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

    it('should throw an error if error in decrypted response', async () => {
      const mockRequest: RequestArguments = {
        method: 'personal_sign',
        params: ['0xMessage', '0xAddress'],
      };

      (decryptContent as jest.Mock).mockResolvedValueOnce({
        result: {
          error: mockError,
        },
      });

      await expect(signer.request(mockRequest)).rejects.toThrowError(mockError);
    });

    it('should update internal state for successful wallet_switchEthereumChain', async () => {
      const mockRequest: RequestArguments = {
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x0' }],
      };

      (decryptContent as jest.Mock).mockResolvedValueOnce({
        result: {
          value: null,
        },
        data: {
          chains: mockChains,
          capabilities: mockCapabilities,
        },
      });

      await signer.request(mockRequest);

      expect(storageStoreSpy).toHaveBeenCalledWith('availableChains', [{ id: 0, rpcUrl: 10 }]);
      expect(storageStoreSpy).toHaveBeenCalledWith('walletCapabilities', mockCapabilities);
      expect(mockUpdateListener.onChainUpdate).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await signer.disconnect();

      expect(mockKeyManager.clear).toHaveBeenCalled();
    });
  });
});
