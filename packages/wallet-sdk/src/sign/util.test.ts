import { Mock, vi } from 'vitest';

import { fetchSignerType, loadSignerType, storeSignerType } from './util.js';
import { Communicator } from ':core/communicator/Communicator.js';
import { CB_KEYS_URL } from ':core/constants.js';
import { Preference } from ':core/provider/interface.js';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';

vi.mock(':core/storage/ScopedLocalStorage');

describe('util', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadSignerType', () => {
    it('should load signer type from storage', () => {
      (ScopedLocalStorage.prototype.getItem as Mock).mockReturnValue('scw');
      const result = loadSignerType();
      expect(result).toBe('scw');
      expect(ScopedLocalStorage.prototype.getItem).toHaveBeenCalledWith('SignerType');
    });

    it('should return null if no signer type is stored', () => {
      (ScopedLocalStorage.prototype.getItem as Mock).mockReturnValue(null);
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
      communicator.postMessage = vi.fn();
      communicator.onMessage = vi.fn().mockResolvedValue({
        data: 'scw',
      });
      const signerType = await fetchSignerType({
        communicator,
        preference,
        metadata,
        handshakeRequest: { method: 'eth_requestAccounts' },
        callback: vi.fn(),
      });
      expect(signerType).toEqual('scw');
    });
  });
});
