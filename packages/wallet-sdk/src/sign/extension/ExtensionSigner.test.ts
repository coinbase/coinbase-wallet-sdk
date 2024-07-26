import { ExtensionSigner } from './ExtensionSigner';
import { AppMetadata, ProviderEventCallback, RequestArguments } from ':core/provider/interface';

const window = globalThis as {
  coinbaseWalletExtension?: unknown;
};

const mockCallback: ProviderEventCallback = jest.fn();

const mockExtensionProvider = {
  setAppInfo: jest.fn(),
  on: jest.fn(),
  request: jest.fn(),
  disconnect: jest.fn(),
};

const eventListeners: { [event: string]: (...args: any[]) => void } = {};

mockExtensionProvider.on = jest.fn((event, listener) => {
  eventListeners[event] = listener;
});

window.coinbaseWalletExtension = mockExtensionProvider;

const metadata: AppMetadata = {
  appName: 'TestApp',
  appLogoUrl: 'https://test.app/logo.png',
  appChainIds: [1, 4],
};

describe('ExtensionSigner', () => {
  let signer: ExtensionSigner;

  beforeEach(() => {
    signer = new ExtensionSigner({ metadata, callback: mockCallback });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should set app info on initialization', () => {
    expect(mockExtensionProvider.setAppInfo).toHaveBeenCalledWith(
      'TestApp',
      'https://test.app/logo.png',
      [1, 4]
    );
  });

  it('should throw error only if Coinbase Wallet extension is not found', () => {
    delete window.coinbaseWalletExtension;
    expect(() => new ExtensionSigner({ metadata, callback: mockCallback })).toThrow(
      'Coinbase Wallet extension not found'
    );
    window.coinbaseWalletExtension = mockExtensionProvider;
    expect(() => new ExtensionSigner({ metadata, callback: mockCallback })).not.toThrow();
  });

  it('should handle chainChanged events', () => {
    eventListeners['chainChanged']('1');
    expect(mockCallback).toHaveBeenCalledWith('chainChanged', '1');
  });

  it('should handle accountsChanged events', () => {
    eventListeners['accountsChanged'](['0x123']);
    expect(mockCallback).toHaveBeenCalledWith('accountsChanged', ['0x123']);
  });

  it('should request accounts during handshake', async () => {
    // expecting extension provider to return accounts and emit an accountsChanged event
    (mockExtensionProvider.request as jest.Mock).mockImplementation((args) =>
      args.method === 'eth_requestAccounts' ? ['0x123'] : null
    );
    eventListeners['accountsChanged'](['0x123']);

    await expect(signer.handshake()).resolves.not.toThrow();
    expect(mockCallback).toHaveBeenCalledWith('accountsChanged', ['0x123']);
  });

  it('should not call callback if extension request throws', async () => {
    (mockExtensionProvider.request as jest.Mock).mockImplementation(() => {
      throw new Error('ext provider request error');
    });
    await expect(signer.handshake()).rejects.toThrow('ext provider request error');
    expect(mockCallback).not.toHaveBeenCalledWith('accountsChanged');
  });

  it('should get results from extension provider', async () => {
    const requestArgs: RequestArguments = { method: 'someReq' };
    (mockExtensionProvider.request as jest.Mock).mockResolvedValueOnce('resFromExt');

    const response = await signer.request(requestArgs);
    expect(response).toBe('resFromExt');
    expect(mockExtensionProvider.request).toHaveBeenCalledWith(requestArgs);
  });

  it('should disconnect from extension provider', async () => {
    await signer.disconnect();
    expect(mockExtensionProvider.disconnect).toHaveBeenCalled();
  });
});
