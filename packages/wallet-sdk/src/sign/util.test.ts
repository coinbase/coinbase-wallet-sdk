import { fetchSignerType, loadSignerType, storeSignerType } from './util';
import { Communicator } from ':core/communicator/Communicator';
import { CB_KEYS_URL } from ':core/constants';
import { Preference } from ':core/provider/interface';
import { ScopedAsyncStorage } from ':core/storage/ScopedAsyncStorage';

jest.mock(':core/storage/ScopedAsyncStorage');

describe('util', () => {
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

  describe('handshake', () => {
    const metadata = {
      appName: 'Test App',
      appLogoUrl: null,
      appChainIds: [1],
      appDeeplinkUrl: null,
    };
    const preference: Preference = { options: 'all' };

    it('should complete signerType selection correctly', async () => {
      const communicator = new Communicator(CB_KEYS_URL, metadata);
      communicator.postMessage = jest.fn();
      communicator.onMessage = jest.fn().mockResolvedValue({
        data: 'scw',
      });
      const signerType = await fetchSignerType({
        communicator,
        preference,
        metadata,
      });
      expect(signerType).toEqual('scw');
    });
  });
});
