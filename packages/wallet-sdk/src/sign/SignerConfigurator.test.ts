import { PopUpCommunicator } from '../core/communicator/PopUpCommunicator';
import { SCWSigner } from './scw/SCWSigner';
import { SignerConfigurator } from './SignerConfigurator';
import { SignRequestHandlerListener } from './UpdateListenerInterface';
import { WLSigner } from './walletlink/WLSigner';

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

  it('should handle disconnect correctly', async () => {
    const signerConfigurator = new SignerConfigurator({
      appName: 'Test App',
      appChainIds: [1],
      smartWalletOnly: false,
      updateListener,
      popupCommunicator,
    });

    await signerConfigurator.onDisconnect();

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

    (popupCommunicator.selectSignerType as jest.Mock).mockResolvedValue('scw');

    const signer = await signerConfigurator.selectSigner();

    expect(signer).toBeInstanceOf(SCWSigner);
    expect(mockSetItem).toHaveBeenCalledWith('SignerType', 'scw');
  });

  describe('tryRestoringSignerFromPersistedType', () => {
    it('should init SCWSigner correctly', () => {
      mockGetItem.mockReturnValueOnce('scw');
      const signerConfigurator = new SignerConfigurator({
        appName: 'Test App',
        appChainIds: [1],
        smartWalletOnly: false,
        updateListener,
        popupCommunicator,
      });

      const signer = signerConfigurator.tryRestoringSignerFromPersistedType();
      expect(signer).toBeInstanceOf(SCWSigner);
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

      const signer = signerConfigurator.tryRestoringSignerFromPersistedType();
      expect(signer).toBeInstanceOf(WLSigner);
    });
  });
});
