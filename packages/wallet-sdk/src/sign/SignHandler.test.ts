import { SCWSigner } from './scw/SCWSigner';
import { SignHandler } from './SignerConfigurator';

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

const mockPostMessageForResponse = jest.fn();
jest.mock(':core/communicator/PopUpCommunicator', () => {
  return {
    PopUpCommunicator: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn(),
        postMessage: jest.fn(),
        postMessageForResponse: mockPostMessageForResponse,
      };
    }),
  };
});

describe('SignerConfigurator', () => {
  let signerConfigurator: SignHandler;

  const updateListener = {
    onAccountsUpdate: jest.fn(),
    onChainUpdate: jest.fn(),
  };

  beforeEach(() => {
    signerConfigurator = new SignHandler({
      metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
      preference: { options: 'all' },
      updateListener,
    });
  });

  it('should complete signerType selection correctly', async () => {
    mockPostMessageForResponse.mockResolvedValue({
      data: 'scw',
    });

    const signer = await signerConfigurator.selectSigner();

    expect(signer).toBeInstanceOf(SCWSigner);
    expect(mockSetItem).toHaveBeenCalledWith('SignerType', 'scw');
  });
});
