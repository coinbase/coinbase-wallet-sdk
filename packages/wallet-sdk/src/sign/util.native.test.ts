import { SCWSigner } from './scw/SCWSigner';
import { createSigner, fetchSignerType, loadSignerType, storeSignerType } from './util.native';
import { Communicator } from ':core/communicator/Communicator';
import { SignerType } from ':core/message';
import { AppMetadata, Preference } from ':core/provider/interface';
import { ScopedAsyncStorage } from ':core/storage/ScopedAsyncStorage';

jest.mock(':core/storage/ScopedAsyncStorage');
jest.mock('./scw/SCWSigner');

describe('Signer Configurator', () => {
  const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ScopedAsyncStorage as jest.Mock).mockImplementation(() => mockStorage);
  });

  describe('loadSignerType', () => {
    it('should load signer type from storage', async () => {
      (ScopedAsyncStorage.prototype.getItem as jest.Mock).mockResolvedValue('scw');
      const result = await loadSignerType();
      expect(result).toBe('scw');
      expect(ScopedAsyncStorage.prototype.getItem).toHaveBeenCalledWith('SignerType');
    });

    it('should return null if no signer type is stored', async () => {
      (ScopedAsyncStorage.prototype.getItem as jest.Mock).mockResolvedValue(null);
      const result = await loadSignerType();
      expect(result).toBeNull();
    });
  });

  describe('storeSignerType', () => {
    it('should store signer type in storage', async () => {
      await storeSignerType('scw');
      expect(ScopedAsyncStorage.prototype.setItem).toHaveBeenCalledWith('SignerType', 'scw');
    });
  });

  describe('fetchSignerType', () => {
    it('should return "scw" as the signer type', async () => {
      const mockParams = {
        communicator: {} as Communicator,
        preference: {} as Preference,
        metadata: {} as AppMetadata,
      };
      const result = await fetchSignerType(mockParams);
      expect(result).toBe('scw');
    });
  });

  describe('createSigner', () => {
    const mockParams = {
      signerType: 'scw' as SignerType,
      metadata: {} as AppMetadata,
      communicator: {} as Communicator,
      callback: jest.fn(),
    };

    it('should create an SCWSigner instance for "scw" signer type', async () => {
      const mockSCWSignerInstance = {};
      (SCWSigner.createInstance as jest.Mock).mockResolvedValue(mockSCWSignerInstance);

      const result = await createSigner(mockParams);

      expect(result).toBe(mockSCWSignerInstance);
      expect(SCWSigner.createInstance).toHaveBeenCalledWith({
        metadata: mockParams.metadata,
        callback: mockParams.callback,
        communicator: mockParams.communicator,
      });
    });

    it('should throw an error for unsupported signer types', async () => {
      const unsupportedParams = { ...mockParams, signerType: 'unsupported' as SignerType };

      await expect(createSigner(unsupportedParams)).rejects.toThrow(
        'Unsupported signer type: unsupported'
      );
    });
  });
});
