import { CoinbaseWalletProvider } from './CoinbaseWalletProvider.js';
import * as util from './sign/util.js';
import * as providerUtil from './util/provider.js';
import { CB_WALLET_RPC_URL } from ':core/constants.js';
import { standardErrorCodes } from ':core/error/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { ProviderEventCallback, RequestArguments } from ':core/provider/interface.js';

function createProvider() {
  return new CoinbaseWalletProvider({
    metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
    preference: { options: 'all' },
  });
}

const mockHandshake = vi.fn();
const mockRequest = vi.fn();
const mockCleanup = vi.fn();
const mockFetchRPCRequest = vi.fn();
const mockFetchSignerType = vi.spyOn(util, 'fetchSignerType');
const mockStoreSignerType = vi.spyOn(util, 'storeSignerType');
const mockLoadSignerType = vi.spyOn(util, 'loadSignerType');

let provider: CoinbaseWalletProvider;
let callback: ProviderEventCallback;

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(util, 'createSigner').mockImplementation((params) => {
    callback = params.callback;
    return {
      accounts: ['0x123'],
      chainId: 1,
      handshake: mockHandshake,
      request: mockRequest,
      cleanup: mockCleanup,
    };
  });
  vi.spyOn(providerUtil, 'fetchRPCRequest').mockImplementation(mockFetchRPCRequest);

  provider = createProvider();
});

describe('Event handling', () => {
  it('emits disconnect event on user initiated disconnection', async () => {
    const disconnectListener = vi.fn();
    provider.on('disconnect', disconnectListener);

    await provider.disconnect();

    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('User initiated disconnection')
    );
  });

  it('should emit chainChanged event on chainId change', async () => {
    const chainChangedListener = vi.fn();
    provider.on('chainChanged', chainChangedListener);

    await provider.request({ method: 'eth_requestAccounts' });
    callback('chainChanged', '0x1');

    expect(chainChangedListener).toHaveBeenCalledWith('0x1');
  });

  it('should emit accountsChanged event on account change', async () => {
    const accountsChangedListener = vi.fn();
    provider.on('accountsChanged', accountsChangedListener);

    await provider.request({ method: 'eth_requestAccounts' });
    callback('accountsChanged', ['0x123']);

    expect(accountsChangedListener).toHaveBeenCalledWith(['0x123']);
  });
});

describe('Request Handling', () => {
  it('returns default chain id even without signer set up', async () => {
    await expect(provider.request({ method: 'eth_chainId' })).resolves.toBe('0x1');
    await expect(provider.request({ method: 'net_version' })).resolves.toBe(1);
  });

  it('throws error when handling invalid request', async () => {
    await expect(provider.request({} as RequestArguments)).rejects.toMatchObject({
      code: standardErrorCodes.rpc.invalidParams,
      message: "'args.method' must be a non-empty string.",
    });
  });

  it('throws error for requests with unsupported or deprecated method', async () => {
    const deprecated = ['eth_sign', 'eth_signTypedData_v2'];
    const unsupported = ['eth_subscribe', 'eth_unsubscribe'];

    for (const method of [...deprecated, ...unsupported]) {
      await expect(provider.request({ method })).rejects.toMatchObject({
        code: standardErrorCodes.provider.unsupportedMethod,
      });
    }
  });
});

describe('Ephemeral methods', () => {
  it('should post requests to wallet rpc url for wallet_getCallsStatus', async () => {
    const args = { method: 'wallet_getCallsStatus' };
    expect(provider['signer']).toBeNull();
    await provider.request(args);
    expect(mockFetchRPCRequest).toHaveBeenCalledWith(args, CB_WALLET_RPC_URL);
    expect(provider['signer']).toBeNull();
  });

  it('should pass args to SCWSigner', async () => {
    const args = { method: 'wallet_sendCalls', params: ['0xdeadbeef'] };
    expect(provider['signer']).toBeNull();
    await provider.request(args);
    expect(mockHandshake).toHaveBeenCalledWith({ method: 'handshake' });
    expect(mockRequest).toHaveBeenCalledWith(args);
    expect(mockCleanup).toHaveBeenCalled();
    expect(provider['signer']).toBeNull();
  });
});

describe('Signer configuration', () => {
  it('should complete signerType selection correctly', async () => {
    mockFetchSignerType.mockResolvedValue('scw');

    const args = { method: 'eth_requestAccounts' };
    await provider.request(args);
    expect(mockHandshake).toHaveBeenCalledWith(args);
  });

  it('should support enable', async () => {
    mockFetchSignerType.mockResolvedValue('scw');
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await provider.enable();
    expect(mockHandshake).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
  });

  it('should pass handshake request args', async () => {
    mockFetchSignerType.mockResolvedValue('scw');

    const argsWithCustomParams = {
      method: 'eth_requestAccounts',
      params: [{ scwOnboardMode: 'create' }],
    };
    await provider.request(argsWithCustomParams);
    expect(mockFetchSignerType).toHaveBeenCalledWith(
      expect.objectContaining({
        handshakeRequest: argsWithCustomParams,
      })
    );
  });

  it('should throw error if signer selection failed', async () => {
    const error = new Error('Signer selection failed');
    mockFetchSignerType.mockRejectedValue(error);

    await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toMatchObject({
      code: standardErrorCodes.rpc.internal,
      message: error.message,
    });
    expect(mockHandshake).not.toHaveBeenCalled();
    expect(mockStoreSignerType).not.toHaveBeenCalled();
  });

  it('should not store signer type unless handshake is successful', async () => {
    const error = new Error('Handshake failed');
    mockFetchSignerType.mockResolvedValue('scw');
    mockHandshake.mockRejectedValue(error);

    await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toMatchObject({
      code: standardErrorCodes.rpc.internal,
      message: error.message,
    });
    expect(mockHandshake).toHaveBeenCalled();
    expect(mockStoreSignerType).not.toHaveBeenCalled();
  });

  it('should load signer from storage when available', async () => {
    mockLoadSignerType.mockReturnValue('scw');
    const providerLoadedFromStorage = createProvider();

    await providerLoadedFromStorage.request({ method: 'eth_requestAccounts' });
    expect(mockHandshake).not.toHaveBeenCalled();

    const request = { method: 'personal_sign', params: ['0x123', '0xdeadbeef'] };
    await providerLoadedFromStorage.request(request);
    expect(mockRequest).toHaveBeenCalledWith(request);

    await providerLoadedFromStorage.disconnect();
    expect(mockCleanup).toHaveBeenCalled();
    expect(provider['signer']).toBeNull();
  });

  it('should throw error if signer is not initialized', async () => {
    await expect(provider.request({ method: 'personal_sign' })).rejects.toMatchObject({
      code: standardErrorCodes.provider.unauthorized,
      message: `Must call 'eth_requestAccounts' before other methods`,
    });
  });

  it('should set signer to null', async () => {
    await provider.request({ method: 'eth_requestAccounts' });

    await provider.disconnect();
    expect(mockCleanup).toHaveBeenCalled();
    expect(provider['signer']).toBeNull();
  });
});
