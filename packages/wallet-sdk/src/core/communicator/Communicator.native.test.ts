import { Communicator } from './Communicator.native';
import { standardErrors } from ':core/error';
import { EncryptedData, MessageID, RPCResponseMessage } from ':core/message';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserPresentationStyle: {
    FORM_SHEET: 'FORM_SHEET',
  },
  dismissBrowser: jest.fn(),
}));

import * as WebBrowser from 'expo-web-browser';

describe('Communicator', () => {
  let communicator: Communicator;
  const mockID = '123' as MessageID;

  beforeEach(() => {
    Communicator.communicators.clear();
    communicator = Communicator.getInstance();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use the default URL if not provided', () => {
      expect(communicator['url']).toBe('https://keys.coinbase.com/connect');
    });

    it('should use the provided URL', () => {
      const customUrl = 'https://custom.com/api';
      const customCommunicator = Communicator.getInstance(customUrl);
      expect(customCommunicator['url']).toBe(customUrl);
    });
  });

  describe('postRequestAndWaitForResponse', () => {
    const mockRequest = {
      id: mockID,
      sdkVersion: '1.0.0',
      callbackUrl: 'https://callback.com',
      content: {
        encrypted: {} as EncryptedData,
      },
      sender: '123',
      timestamp: new Date('2022-02-01T20:30:45.500Z'),
    };

    it('should open browser with correct URL on iOS', async () => {
      (WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValue({ type: 'dismiss' });

      communicator.postRequestAndWaitForResponse(mockRequest);

      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        'https://keys.coinbase.com/connect?id=%22123%22&sdkVersion=%221.0.0%22&callbackUrl=%22https%3A%2F%2Fcallback.com%22&content=%7B%22encrypted%22%3A%7B%7D%7D&sender=%22123%22&timestamp=%222022-02-01T20%3A30%3A45.500Z%22',
        {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        }
      );
      expect(communicator['responseHandlers'].get(mockID)).toBeDefined();
    });

    it('should open browser with correct URL on Android', async () => {
      (WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValue({ type: 'opened' });

      communicator.postRequestAndWaitForResponse(mockRequest);

      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        'https://keys.coinbase.com/connect?id=%22123%22&sdkVersion=%221.0.0%22&callbackUrl=%22https%3A%2F%2Fcallback.com%22&content=%7B%22encrypted%22%3A%7B%7D%7D&sender=%22123%22&timestamp=%222022-02-01T20%3A30%3A45.500Z%22',
        {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        }
      );
      expect(communicator['responseHandlers'].get(mockID)).toBeDefined();
    });

    it('should reject with user rejected error when browser is cancelled on iOS', async () => {
      (WebBrowser.openBrowserAsync as jest.Mock).mockResolvedValue({ type: 'cancel' });

      await expect(communicator.postRequestAndWaitForResponse(mockRequest)).rejects.toEqual(
        standardErrors.provider.userRejectedRequest()
      );

      expect(communicator['responseHandlers'].get(mockID)).toBeUndefined();
    });

    it('should reject with user rejected error when browser throws an error', async () => {
      (WebBrowser.openBrowserAsync as jest.Mock).mockRejectedValue(new Error('Browser error'));

      await expect(communicator.postRequestAndWaitForResponse(mockRequest)).rejects.toEqual(
        standardErrors.provider.userRejectedRequest()
      );

      expect(communicator['responseHandlers'].get(mockID)).toBeUndefined();
    });
  });

  describe('handleResponse', () => {
    const mockResponse: RPCResponseMessage = {
      id: '456' as MessageID,
      sender: 'test-sender',
      requestId: '123' as MessageID,
      content: { encrypted: {} as EncryptedData },
      timestamp: new Date('2022-02-01T20:30:45.500Z'),
    };

    it('should parse response and call the correct handler', () => {
      const mockHandler = jest.fn();
      communicator['responseHandlers'].set(mockResponse.requestId, mockHandler);

      const responseUrl = `https://callback.com/?id="${mockResponse.id}"&sender="${mockResponse.sender}"&requestId="${mockResponse.requestId}"&content=${JSON.stringify(mockResponse.content)}&timestamp="${mockResponse.timestamp.toISOString()}"`;

      communicator.handleResponse(responseUrl);

      expect(mockHandler).toHaveBeenCalledWith(mockResponse);
      expect(communicator['responseHandlers'].size).toBe(0);
      expect(WebBrowser.dismissBrowser).toHaveBeenCalled();
    });

    it('should not throw if no handler is found', () => {
      const responseUrl = `https://callback.com/?id="${mockResponse.id}"&sender="${mockResponse.sender}"&requestId="${mockResponse.requestId}"&content=${JSON.stringify(mockResponse.content)}&timestamp="${mockResponse.timestamp.toISOString()}"`;

      expect(() => communicator.handleResponse(responseUrl)).not.toThrow();
    });

    it('should return true if the communicator handled the message', () => {
      const mockHandler = jest.fn();
      communicator['responseHandlers'].set(mockResponse.requestId, mockHandler);

      const responseUrl = `https://callback.com/?id="${mockResponse.id}"&sender="${mockResponse.sender}"&requestId="${mockResponse.requestId}"&content=${JSON.stringify(mockResponse.content)}&timestamp="${mockResponse.timestamp.toISOString()}"`;
      const handled = communicator.handleResponse(responseUrl);

      expect(handled).toBe(true);
    });

    it('should return false if the communicator did not handle the message', () => {
      const responseUrl = `https://callback.com/?id="${mockResponse.id}"&sender="${mockResponse.sender}"&requestId="${mockResponse.requestId}"&content=${JSON.stringify(mockResponse.content)}&timestamp="${mockResponse.timestamp.toISOString()}"`;
      const handled = communicator.handleResponse(responseUrl);

      expect(handled).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should clear all response handlers', () => {
      communicator['responseHandlers'].set('123' as MessageID, jest.fn());
      communicator['responseHandlers'].set('456' as MessageID, jest.fn());

      communicator['disconnect']();

      expect(communicator['responseHandlers'].size).toBe(0);
    });
  });
});
