import { StateUpdateListener } from '../interface';
import { ExtensionSigner } from './ExtensionSigner';
import { AppMetadata, RequestArguments } from ':core/provider/interface';
import { AddressString } from ':core/type';

const window = globalThis as {
  coinbaseWalletExtension?: unknown;
};

const mockUpdateListener: StateUpdateListener = {
  onChainIdUpdate: jest.fn(),
  onAccountsUpdate: jest.fn(),
};

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
    signer = new ExtensionSigner({ metadata, updateListener: mockUpdateListener });
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
    expect(() => new ExtensionSigner({ metadata, updateListener: mockUpdateListener })).toThrow(
      'Coinbase Wallet extension not found'
    );
    window.coinbaseWalletExtension = mockExtensionProvider;
    expect(
      () => new ExtensionSigner({ metadata, updateListener: mockUpdateListener })
    ).not.toThrow();
  });

  it('should handle chainChanged events', () => {
    eventListeners['chainChanged']('1');
    expect(mockUpdateListener.onChainIdUpdate).toHaveBeenCalledWith(1);
  });

  it('should handle accountsChanged events', () => {
    eventListeners['accountsChanged'](['0x123']);
    expect(mockUpdateListener.onAccountsUpdate).toHaveBeenCalledWith(['0x123'] as AddressString[]);
  });

  it('should request accounts during handshake', async () => {
    (mockExtensionProvider.request as jest.Mock).mockImplementation((args) =>
      args.method === 'eth_requestAccounts' ? ['0x123'] : null
    );

    const accounts = await signer.handshake();
    expect(accounts).toEqual(['0x123']);
    expect(mockUpdateListener.onAccountsUpdate).toHaveBeenCalledWith(['0x123']);
  });

  it('should not call updateListener if extension request throws', async () => {
    (mockExtensionProvider.request as jest.Mock).mockImplementation(() => {
      throw new Error('ext provider request error');
    });
    await expect(signer.handshake()).rejects.toThrow('ext provider request error');
    expect(mockUpdateListener.onAccountsUpdate).not.toHaveBeenCalled();
  });

  it('should get results from extension provider', async () => {
    const requestArgs: RequestArguments = { method: 'someReq' };
    (mockExtensionProvider.request as jest.Mock).mockResolvedValueOnce('resFromExt');

    const response = await signer.request<string>(requestArgs);
    expect(response).toBe('resFromExt');
    expect(mockExtensionProvider.request).toHaveBeenCalledWith(requestArgs);
  });

  it('should disconnect from extension provider', async () => {
    await signer.disconnect();
    expect(mockExtensionProvider.disconnect).toHaveBeenCalled();
  });
});
