import { SignHandler } from './SignHandler';

const mockGetItem = jest.fn();
jest.mock(':core/storage/ScopedLocalStorage', () => {
  return {
    ScopedLocalStorage: jest.fn().mockImplementation(() => {
      return {
        getItem: mockGetItem,
        removeItem: jest.fn(),
        clear: jest.fn(),
        setItem: jest.fn(),
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

const mockHandshake = jest.fn();
const mockRequest = jest.fn();
jest.mock('./scw/SCWSigner', () => {
  return {
    SCWSigner: jest.fn().mockImplementation(() => {
      return {
        handshake: mockHandshake,
        request: mockRequest,
      };
    }),
  };
});

describe('SignerConfigurator', () => {
  function createSignHandler() {
    return new SignHandler({
      metadata: { appName: 'Test App', appLogoUrl: null, appChainIds: [1] },
      preference: { options: 'all' },
      listener: {
        onAccountsUpdate: jest.fn(),
        onChainUpdate: jest.fn(),
      },
    });
  }

  it('should complete signerType selection correctly', async () => {
    mockPostMessageForResponse.mockResolvedValueOnce({
      data: 'scw',
    });
    const handler = createSignHandler();
    await handler.handshake();
    expect(mockHandshake).toHaveBeenCalledWith();
  });

  it('should load signer from storage when available', async () => {
    mockGetItem.mockReturnValueOnce('scw');
    const handler = createSignHandler();
    await handler.request({} as any);
    expect(mockRequest).toHaveBeenCalledWith({} as any);
  });

  it('should throw error if signer is not initialized', async () => {
    const handler = createSignHandler();
    await expect(handler.request({} as any)).rejects.toThrow('Signer is not initialized');
  });
});
