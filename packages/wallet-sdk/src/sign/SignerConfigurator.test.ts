import { SignRequestHandlerListener } from './interface';
import { SCWSigner } from './scw/SCWSigner';
import { SignerConfigurator } from './SignerConfigurator';
import { WLSigner } from './walletlink/WLSigner';
import { PopUpCommunicator } from ':core/communicator/PopUpCommunicator';

jest.mock(':core/communicator/PopUpCommunicator');

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
  let signerConfigurator: SignerConfigurator;

  const updateListener: SignRequestHandlerListener = {
    onAccountsUpdate: jest.fn(),
    onChainUpdate: jest.fn(),
    onConnect: jest.fn(),
    onResetConnection: jest.fn(),
  };

  beforeEach(() => {
    popupCommunicator = new PopUpCommunicator({ url: 'http://google.com' });
    signerConfigurator = new SignerConfigurator({
      metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
      preference: { options: 'all' },
      updateListener,
      popupCommunicator,
    });
  });

  it('should handle disconnect correctly', async () => {
    signerConfigurator.clearStorage();

    expect(mockRemoveItem).toHaveBeenCalled();
  });

  it('should complete signerType selection correctly', async () => {
    (popupCommunicator.postMessageForResponse as jest.Mock).mockResolvedValue({
      data: 'scw',
    });

    const signer = await signerConfigurator.selectSigner();

    expect(signer).toBeInstanceOf(SCWSigner);
    expect(mockSetItem).toHaveBeenCalledWith('SignerType', 'scw');
  });

  describe('tryRestoringSignerFromPersistedType', () => {
    it('should init SCWSigner correctly', () => {
      mockGetItem.mockReturnValueOnce('scw');

      const signer = signerConfigurator.tryRestoringSignerFromPersistedType();
      expect(signer).toBeInstanceOf(SCWSigner);
    });

    it('should init WLSigner correctly', () => {
      mockGetItem.mockReturnValueOnce('walletlink');

      const signer = signerConfigurator.tryRestoringSignerFromPersistedType();
      expect(signer).toBeInstanceOf(WLSigner);
    });
  });
});
