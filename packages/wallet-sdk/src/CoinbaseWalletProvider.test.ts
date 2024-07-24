import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { standardErrorCodes, standardErrors } from './core/error';
import { StateUpdateListener } from './sign/interface';
import * as util from './sign/util';
import { RequestArguments } from ':core/provider/interface';
import { AddressString } from ':core/type';

function createProvider() {
  return new CoinbaseWalletProvider({
    metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
    preference: { options: 'all' },
  });
}

const mockHandshake = jest.fn();
const mockRequest = jest.fn();
const mockDisconnect = jest.fn();
const mockFetchSignerType = jest.spyOn(util, 'fetchSignerType');
const mockStoreSignerType = jest.spyOn(util, 'storeSignerType');
const mockLoadSignerType = jest.spyOn(util, 'loadSignerType');

let provider: CoinbaseWalletProvider;
let updateListener: StateUpdateListener;

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(util, 'createSigner').mockImplementation(async (params) => {
    updateListener = params.updateListener;
    return {
      accounts: [AddressString('0x123')],
      chainId: 1,
      handshake: mockHandshake,
      request: mockRequest,
      disconnect: mockDisconnect,
    };
  });

  provider = createProvider();
});

describe('Event handling', () => {
  it('should emit connect on eth_requestAccounts request', async () => {
    const connectListener = jest.fn();
    provider.on('connect', connectListener);

    await provider.request({ method: 'eth_requestAccounts' });
    expect(connectListener).toHaveBeenCalledWith({ chainId: '0x1' });
  });

  it('emits disconnect event on user initiated disconnection', async () => {
    const disconnectListener = jest.fn();
    provider.on('disconnect', disconnectListener);

    await provider.disconnect();

    expect(disconnectListener).toHaveBeenCalledWith(
      standardErrors.provider.disconnected('User initiated disconnection')
    );
  });

  it('should emit chainChanged event on chainId change', async () => {
    const chainChangedListener = jest.fn();
    provider.on('chainChanged', chainChangedListener);

    await provider.request({ method: 'eth_requestAccounts' });
    updateListener.onChainIdUpdate(1);

    expect(chainChangedListener).toHaveBeenCalledWith('0x1');
  });

  it('should emit accountsChanged event on account change', async () => {
    const accountsChangedListener = jest.fn();
    provider.on('accountsChanged', accountsChangedListener);

    await provider.request({ method: 'eth_requestAccounts' });
    updateListener.onAccountsUpdate([AddressString('0x123')]);

    expect(accountsChangedListener).toHaveBeenCalledWith(['0x123']);
  });
});

describe('Request Handling', () => {
  it('returns default chain id even without signer set up', async () => {
    expect(provider.request({ method: 'eth_chainId' })).resolves.toBe('0x1');
    expect(provider.request({ method: 'net_version' })).resolves.toBe(1);
  });

  it('throws error when handling invalid request', async () => {
    await expect(provider.request({} as RequestArguments)).rejects.toThrowEIPError(
      standardErrorCodes.rpc.invalidParams,
      "'args.method' must be a non-empty string."
    );
  });

  it('throws error for requests with unsupported or deprecated method', async () => {
    const deprecated = ['eth_sign', 'eth_signTypedData_v2'];
    const unsupported = ['eth_subscribe', 'eth_unsubscribe'];

    for (const method of [...deprecated, ...unsupported]) {
      await expect(provider.request({ method })).rejects.toThrowEIPError(
        standardErrorCodes.provider.unsupportedMethod
      );
    }
  });
});

describe('Signer configuration', () => {
  it('should complete signerType selection correctly', async () => {
    mockFetchSignerType.mockResolvedValue('scw');

    await provider.request({ method: 'eth_requestAccounts' });
    expect(mockHandshake).toHaveBeenCalledWith();
  });

  it('should support enable', async () => {
    mockFetchSignerType.mockResolvedValue('scw');
    jest.spyOn(console, 'warn').mockImplementation();

    await provider.enable();
    expect(mockHandshake).toHaveBeenCalledWith();
  });

  it('should throw error if signer selection failed', async () => {
    const error = new Error('Signer selection failed');
    mockFetchSignerType.mockRejectedValue(error);

    await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowEIPError(
      standardErrorCodes.rpc.internal,
      error.message
    );
    expect(mockHandshake).not.toHaveBeenCalled();
    expect(mockStoreSignerType).not.toHaveBeenCalled();
  });

  it('should not store signer type unless handshake is successful', async () => {
    const error = new Error('Handshake failed');
    mockFetchSignerType.mockResolvedValue('scw');
    mockHandshake.mockRejectedValue(error);

    await expect(provider.request({ method: 'eth_requestAccounts' })).rejects.toThrowEIPError(
      standardErrorCodes.rpc.internal,
      error.message
    );
    expect(mockHandshake).toHaveBeenCalled();
    expect(mockStoreSignerType).not.toHaveBeenCalled();
  });

  it('should load signer from storage when available', async () => {
    mockLoadSignerType.mockReturnValue(Promise.resolve('scw'));
    const providerLoadedFromStorage = createProvider();

    await providerLoadedFromStorage.request({ method: 'eth_requestAccounts' });
    expect(mockHandshake).not.toHaveBeenCalled();

    const request = { method: 'personal_sign', params: ['0x123', '0xdeadbeef'] };
    await providerLoadedFromStorage.request(request);
    expect(mockRequest).toHaveBeenCalledWith(request);

    await providerLoadedFromStorage.disconnect();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should throw error if signer is not initialized', async () => {
    await expect(provider.request({ method: 'personal_sign' })).rejects.toThrowEIPError(
      standardErrorCodes.provider.unauthorized,
      `Must call 'eth_requestAccounts' before other methods`
    );
  });

  it('should call signer.disconnect on provider disconnect', async () => {
    await provider.request({ method: 'eth_requestAccounts' });

    await provider.disconnect();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
