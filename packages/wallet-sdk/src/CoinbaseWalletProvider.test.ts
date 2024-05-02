import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';

const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
jest.mock(':util/ScopedLocalStorage', () => {
  return {
    ScopedLocalStorage: jest.fn().mockImplementation(() => {
      return {
        getItem: mockGetItem,
        removeItem: jest.fn(),
        clear: jest.fn(),
        setItem: mockSetItem,
      };
    }),
  };
});

const mockPostMessage = jest.fn();
const mockHandshake = jest.fn();
const mockRequest = jest.fn();
jest.mock('./sign/scw/SCWSigner', () => {
  return {
    SCWSigner: jest.fn().mockImplementation(() => {
      return {
        handshake: mockHandshake,
        request: mockRequest,
      };
    }),
  };
});

describe('CoinbaseWalletProvider', () => {
  function createProvider() {
    const provider = new CoinbaseWalletProvider({
      metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
      preference: { options: 'all' },
    });
    provider.postMessage = mockPostMessage;
    return provider;
  }

  describe('handshake', () => {
    it('should complete signerType selection correctly', async () => {
      mockHandshake.mockResolvedValueOnce(['0x123']);
      mockPostMessage.mockResolvedValueOnce({
        data: 'scw',
      });

      const provider = createProvider();
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      expect(accounts).toEqual(['0x123']);
      expect(mockHandshake).toHaveBeenCalledWith();
    });

    it('should throw error if signer selection failed', async () => {
      const error = new Error('Signer selection failed');
      mockPostMessage.mockRejectedValueOnce(error);

      const provider = createProvider();
      await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrow(error);
      expect(mockHandshake).not.toHaveBeenCalled();
      expect(mockSetItem).not.toHaveBeenCalled();

      await expect(provider.request({} as any)).rejects.toThrow('Signer is not initialized');
    });

    it('should not store signer type unless handshake is successful', async () => {
      const error = new Error('Handshake failed');
      mockHandshake.mockRejectedValueOnce(error);
      mockPostMessage.mockResolvedValueOnce({
        data: 'scw',
      });

      const provider = createProvider();
      await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrow(error);
      expect(mockHandshake).toHaveBeenCalled();
      expect(mockSetItem).not.toHaveBeenCalled();

      await expect(provider.request({} as any)).rejects.toThrow('Signer is not initialized');
    });
  });

  it('should load signer from storage when available', async () => {
    mockGetItem.mockReturnValueOnce('scw');
    const provider = createProvider();
    await provider.request({ method: 'eth_requestAccounts' });
    expect(mockRequest).toHaveBeenCalledWith({} as any);
  });

  it('should throw error if signer is not initialized', async () => {
    const handler = createProvider();
    await expect(handler.request({ method: 'personal_sign' })).rejects.toThrow(
      'Signer is not initialized'
    );
  });
});
