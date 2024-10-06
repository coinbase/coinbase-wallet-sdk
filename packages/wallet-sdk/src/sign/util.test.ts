import { fetchSignerType, loadSignerType, storeSignerType } from './util';
import { Communicator } from ':core/communicator/Communicator';
import { CB_KEYS_URL } from ':core/constants';
import { Preference } from ':core/provider/interface';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage';

jest.mock(':core/storage/ScopedLocalStorage');

describe('util', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadSignerType', () => {
    it('should load signer type from storage', () => {
      (ScopedLocalStorage.prototype.getItem as jest.Mock).mockReturnValue('scw');
      const result = loadSignerType();
      expect(result).toBe('scw');
      expect(ScopedLocalStorage.prototype.getItem).toHaveBeenCalledWith('SignerType');
    });

    it('should return null if no signer type is stored', () => {
      (ScopedLocalStorage.prototype.getItem as jest.Mock).mockReturnValue(null);
      const result = loadSignerType();
      expect(result).toBeNull();
    });
  });

  describe('storeSignerType', () => {
    it('should store signer type in storage', () => {
      storeSignerType('scw');
      expect(ScopedLocalStorage.prototype.setItem).toHaveBeenCalledWith('SignerType', 'scw');
    });
  });

  describe('handshake', () => {
    const metadata = {
      appName: 'Test App',
      appLogoUrl: null,
      appChainIds: [1],
    };
    const preference: Preference = { options: 'all' };

    it('should complete signerType selection correctly', async () => {
      const communicator = new Communicator({
        url: CB_KEYS_URL,
        metadata,
        preference: { keysUrl: CB_KEYS_URL, options: 'all' },
      });
      communicator.postMessage = jest.fn();
      communicator.onMessage = jest.fn().mockResolvedValue({
        data: 'scw',
      });
      const signerType = await fetchSignerType({
        communicator,
        preference,
        metadata,
        handshakeRequest: { method: 'eth_requestAccounts' },
        callback: jest.fn(),
      });
      expect(signerType).toEqual('scw');
    });
  });
});
