import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { standardErrors } from './core/error';
import { fetchSignerType, loadSignerType, storeSignerType } from './sign/util';

function createProvider() {
  return new CoinbaseWalletProvider({
    metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
    preference: { options: 'all' },
  });
}

describe('CoinbaseWalletProvider', () => {
  it('emits disconnect event on user initiated disconnection', async () => {
    const disconnectListener = jest.fn();
    const provider = createProvider();
    provider.on('disconnect', disconnectListener);

    await provider.disconnect();

    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('User initiated disconnection')
    );
  });

  describe('Request Handling', () => {
    test('handles request correctly', async () => {
      const provider = createProvider();
      const response1 = await provider.request({ method: 'eth_chainId' });
      expect(response1).toBe('0x1');
    });

    test('throws error when handling invalid request', async () => {
      const provider = createProvider();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      await expect(provider.request({})).rejects.toMatchObject({
        code: -32602,
        message: "'args.method' must be a non-empty string.",
      });
    });
  });
});

const mockHandshake = jest.fn();
const mockRequest = jest.fn();

jest.mock('./sign/util', () => {
  return {
    fetchSignerType: jest.fn(),
    loadSignerType: jest.fn(),
    storeSignerType: jest.fn(),
    createSigner: () => ({
      chain: { id: 1 },
      handshake: mockHandshake,
      request: mockRequest,
    }),
  };
});

describe('signer configuration', () => {
  it('should complete signerType selection correctly', async () => {
    (fetchSignerType as jest.Mock).mockResolvedValue('scw');
    mockHandshake.mockResolvedValueOnce(['0x123']);

    const provider = createProvider();
    await provider.request({ method: 'eth_requestAccounts' });
    expect(mockHandshake).toHaveBeenCalledWith();
  });

  it('should throw error if signer selection failed', async () => {
    const error = new Error('Signer selection failed');
    (fetchSignerType as jest.Mock).mockRejectedValue(error);

    const provider = createProvider();
    await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrow(error);
    expect(mockHandshake).not.toHaveBeenCalled();
    expect(storeSignerType as jest.Mock).not.toHaveBeenCalled();
  });

  it('should not store signer type unless handshake is successful', async () => {
    const error = new Error('Handshake failed');
    (fetchSignerType as jest.Mock).mockResolvedValueOnce('scw');
    mockHandshake.mockRejectedValueOnce(error);

    const provider = createProvider();
    await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrow(error);
    expect(mockHandshake).toHaveBeenCalled();
    expect(storeSignerType as jest.Mock).not.toHaveBeenCalled();
  });

  it('should load signer from storage when available', async () => {
    (loadSignerType as jest.Mock).mockReturnValueOnce('scw');
    const provider = createProvider();
    // @ts-expect-error // TODO: should be able to mock cached accounts
    (provider.signer as SCWSigner).accounts = ['0x123'];
    const request = { method: 'personal_sign', params: ['0x123', '0xdeadbeef'] };
    provider.request(request);
    expect(mockRequest).toHaveBeenCalledWith(request);
  });

  it('should throw error if signer is not initialized', async () => {
    const provider = createProvider();
    await expect(provider.request({ method: 'personal_sign' })).rejects.toThrow(
      `Must call 'eth_requestAccounts' before other methods`
    );
  });
});
