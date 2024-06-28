import { StateUpdateListener } from '../interface'; // Adjust the import path as needed
import { ExtensionSigner } from './ExtensionSigner'; // Adjust the import path as needed
import { AppMetadata, RequestArguments } from ':core/provider/interface'; // Adjust the import path as needed
import { AddressString } from ':core/type'; // Adjust the import path as needed
import { CBInjectedProvider, CBWindow } from ':util/provider'; // Adjust the import path as needed

// Mocking CBInjectedProvider and StateUpdateListener
const mockUpdateListener: StateUpdateListener = {
  onChainUpdate: jest.fn(),
  onAccountsUpdate: jest.fn(),
};

const mockExtensionProvider: Partial<CBInjectedProvider> = {
  setAppInfo: jest.fn(),
  on: jest.fn(),
  request: jest.fn(),
  disconnect: jest.fn(),
};

const eventListeners: { [event: string]: (...args: any[]) => void } = {};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
mockExtensionProvider.on = jest.fn((event, listener) => {
  eventListeners[event] = listener;
});

(globalThis as CBWindow).coinbaseWalletExtension = mockExtensionProvider as CBInjectedProvider;

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
    delete (globalThis as CBWindow).coinbaseWalletExtension;
    expect(() => new ExtensionSigner({ metadata, updateListener: mockUpdateListener })).toThrow(
      'Coinbase Wallet extension not found'
    );
    (globalThis as CBWindow).coinbaseWalletExtension = mockExtensionProvider as CBInjectedProvider;
    expect(
      () => new ExtensionSigner({ metadata, updateListener: mockUpdateListener })
    ).not.toThrow();
  });

  it('should handle chainChanged events', () => {
    eventListeners['chainChanged']('1');
    expect(mockUpdateListener.onChainUpdate).toHaveBeenCalledWith({
      chain: { id: 1 },
      source: 'wallet',
    });
  });

  it('should handle accountsChanged events', () => {
    eventListeners['accountsChanged'](['0x123']);
    expect(mockUpdateListener.onAccountsUpdate).toHaveBeenCalledWith({
      accounts: ['0x123'] as AddressString[],
      source: 'wallet',
    });
  });

  it('should request accounts during handshake', async () => {
    (mockExtensionProvider.request as jest.Mock).mockImplementation((args) =>
      args.method === 'eth_requestAccounts' ? ['0x123'] : null
    );

    const accounts = await signer.handshake();
    expect(accounts).toEqual(['0x123']);
    expect(mockUpdateListener.onAccountsUpdate).toHaveBeenCalledWith({
      accounts: ['0x123'],
      source: 'wallet',
    });
  });

  it('should throw error if no accounts found during handshake', async () => {
    (mockExtensionProvider.request as jest.Mock).mockResolvedValue(null);
    await expect(signer.handshake()).rejects.toThrow('No account found');
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
