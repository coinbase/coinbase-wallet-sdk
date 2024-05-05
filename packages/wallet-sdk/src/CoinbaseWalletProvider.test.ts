import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { standardErrors } from './core/error';
import { fetchSignerType, loadSignerType, storeSignerType } from './sign/util';
import { AddressString } from ':core/type';

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
      expect(response1).toBe(1);
    });

    test('throws error when handling invalid request', async () => {
      const provider = createProvider();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error // testing invalid request args
      await expect(provider.request({})).rejects.toThrow();
    });
  });
});

jest.mock('./sign/util');
const mockFetchSignerType = fetchSignerType as jest.Mock;
const mockLoadSignerType = loadSignerType as jest.Mock;
const mockStoreSignerType = storeSignerType as jest.Mock;

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

describe('signer configuration', () => {
  it('should complete signerType selection correctly', async () => {
    mockFetchSignerType.mockResolvedValue('scw');
    mockHandshake.mockResolvedValueOnce(['0x123']);

    const provider = createProvider();
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    expect(accounts).toEqual(['0x123']);
    expect(mockHandshake).toHaveBeenCalledWith();
  });

  it('should throw error if signer selection failed', async () => {
    const error = new Error('Signer selection failed');
    mockFetchSignerType.mockRejectedValueOnce(error);

    const provider = createProvider();
    await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrow(error);
    expect(mockHandshake).not.toHaveBeenCalled();
    expect(mockStoreSignerType).not.toHaveBeenCalled();
  });

  it('should not store signer type unless handshake is successful', async () => {
    const error = new Error('Handshake failed');
    mockFetchSignerType.mockResolvedValueOnce('scw');
    mockHandshake.mockRejectedValueOnce(error);

    const provider = createProvider();
    await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrow(error);
    expect(mockHandshake).toHaveBeenCalled();
    expect(mockStoreSignerType).not.toHaveBeenCalled();
  });

  it('should load signer from storage when available', async () => {
    mockLoadSignerType.mockReturnValueOnce('scw');
    const provider = createProvider();
    // @ts-expect-error // TODO: should be able to mock cached accounts
    provider.accounts = [AddressString('0x123')];
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
