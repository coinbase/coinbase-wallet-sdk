import { SCWSigner } from './scw/SCWSigner';
import { PopUpCommunicator } from './scw/transport/PopUpCommunicator';
import { SignerConfigurator } from './SignerConfigurator';
import { Signer } from './SignerInterface';
import { SignRequestHandlerListener } from './UpdateListenerInterface';
import { WLSigner } from './walletlink/WLSigner';

declare global {
  interface Window {
    coinbaseWalletExtensionSigner?: Signer;
  }
}

jest.mock('./scw/transport/PopUpCommunicator');

const mockSetItem = jest.fn();
const mockGetItem = jest.fn();
const mockRemoveItem = jest.fn();
jest.mock(':core/storage/ScopedLocalStorage', () => {
  return {
    ScopedLocalStorage: jest.fn().mockImplementation(() => {
      return {
        getItem: mockGetItem,
        removeItem: mockRemoveItem,
        clear: jest.fn(),
        setItem: mockSetItem,
      };
    }),
  };
});

describe('SignerConfigurator', () => {
  let popupCommunicator: PopUpCommunicator;

  const updateListener: SignRequestHandlerListener = {
    onAccountsUpdate: jest.fn(),
    onChainUpdate: jest.fn(),
    onConnect: jest.fn(),
    onResetConnection: jest.fn(),
  };

  beforeEach(() => {
    popupCommunicator = new PopUpCommunicator({ url: 'http://google.com' });
  });

  it('should not init Signer when no saved signerType', () => {
    const signerConfigurator = new SignerConfigurator({
      appName: 'Test App',
      appChainIds: [1],
      smartWalletOnly: false,
      updateListener,
      popupCommunicator,
    });

    expect(signerConfigurator.signerType).toBeUndefined();
    expect(signerConfigurator.signer).toBeUndefined();
  });

  it('should initialize SCWSigner correctly', () => {
    const signerConfigurator = new SignerConfigurator({
      appName: 'Test App',
      appChainIds: [1],
      smartWalletOnly: false,
      updateListener,
      popupCommunicator,
    });

    signerConfigurator.signerType = 'scw';
    signerConfigurator.initSigner();

    expect(signerConfigurator.signer).toBeInstanceOf(SCWSigner);
  });

  it('should initialize WLSigner correctly', () => {
    const signerConfigurator = new SignerConfigurator({
      appName: 'Test App',
      appChainIds: [1],
      smartWalletOnly: false,
      updateListener,
      popupCommunicator,
    });

    signerConfigurator.signerType = 'walletlink';
    signerConfigurator.initSigner();

    expect(signerConfigurator.signer).toBeInstanceOf(WLSigner);
  });

  it('should initialize ExtensionSigner correctly', () => {
    const signerConfigurator = new SignerConfigurator({
      appName: 'Test App',
      appChainIds: [1],
      smartWalletOnly: false,
      updateListener,
      popupCommunicator,
    });

    window.coinbaseWalletExtensionSigner = {
      handshake: jest.fn(),
      request: jest.fn(),
      disconnect: jest.fn(),
    };

    signerConfigurator.signerType = 'extension';
    signerConfigurator.initSigner();

    expect(signerConfigurator.signer).toBe(window.coinbaseWalletExtensionSigner);
  });

  it('should handle disconnect correctly', async () => {
    const signerConfigurator = new SignerConfigurator({
      appName: 'Test App',
      appChainIds: [1],
      smartWalletOnly: false,
      updateListener,
      popupCommunicator,
    });

    signerConfigurator.signerType = 'scw';
    signerConfigurator.initSigner();

    await signerConfigurator.onDisconnect();

    expect(signerConfigurator.signer).toBeUndefined();
    expect(signerConfigurator.signerType).toBeNull();
    expect(mockRemoveItem).toHaveBeenCalled();
  });

  it('should complete signerType selection correctly', async () => {
    const signerConfigurator = new SignerConfigurator({
      appName: 'Test App',
      appChainIds: [1],
      smartWalletOnly: false,
      updateListener,
      popupCommunicator,
    });

    expect(signerConfigurator.signerType).toBeUndefined();
    expect(signerConfigurator.signer).toBeUndefined();

    (popupCommunicator.selectSignerType as jest.Mock).mockResolvedValue('scw');

    await signerConfigurator.completeSignerTypeSelection();

    expect(signerConfigurator.signerType).toBe('scw');
    expect(mockSetItem).toHaveBeenCalledWith('SignerType', 'scw');
  });

  describe('init signer at constructor', () => {
    it('should init SCWSigner correctly', () => {
      mockGetItem.mockReturnValueOnce('scw');
      const signerConfigurator = new SignerConfigurator({
        appName: 'Test App',
        appChainIds: [1],
        smartWalletOnly: false,
        updateListener,
        popupCommunicator,
      });

      signerConfigurator.signerType = 'scw';
      expect(signerConfigurator.signer).toBeInstanceOf(SCWSigner);
    });

    it('should init WLSigner correctly', () => {
      mockGetItem.mockReturnValueOnce('walletlink');
      const signerConfigurator = new SignerConfigurator({
        appName: 'Test App',
        appChainIds: [1],
        smartWalletOnly: false,
        updateListener,
        popupCommunicator,
      });

      signerConfigurator.signerType = 'walletlink';
      expect(signerConfigurator.signer).toBeInstanceOf(WLSigner);
    });

    it('should init ExtensionSigner correctly', () => {
      mockGetItem.mockReturnValueOnce('extension');
      window.coinbaseWalletExtensionSigner = {
        handshake: jest.fn(),
        request: jest.fn(),
        disconnect: jest.fn(),
      };
      const signerConfigurator = new SignerConfigurator({
        appName: 'Test App',
        appChainIds: [1],
        smartWalletOnly: false,
        updateListener,
        popupCommunicator,
      });

      signerConfigurator.signerType = 'extension';
      expect(signerConfigurator.signer).toBe(window.coinbaseWalletExtensionSigner);
    });

    it('should disconnect at signer initialization error', () => {
      mockGetItem.mockReturnValueOnce('extension');
      window.coinbaseWalletExtensionSigner = undefined;
      const signerConfigurator = new SignerConfigurator({
        appName: 'Test App',
        appChainIds: [1],
        smartWalletOnly: false,
        updateListener,
        popupCommunicator,
      });

      expect(signerConfigurator.signer).toBeUndefined();
      expect(mockRemoveItem).toHaveBeenCalledWith('SignerType');
      expect(signerConfigurator.signerType).toBeNull();
    });
  });
});
