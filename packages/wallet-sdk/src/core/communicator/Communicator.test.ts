import { LIB_VERSION } from '../../version';
import { Message, RPCRequestMessage } from '../message';
import { Communicator } from './Communicator';
import { openPopup } from './util';
import { CB_KEYS_URL } from ':core/constants';

jest.mock('./util', () => ({
  openPopup: jest.fn(),
  closePopup: jest.fn(),
}));

// Dispatches a message event to simulate postMessage calls from the popup
function dispatchMessageEvent({ data, origin }: { data: Record<string, any>; origin: string }) {
  const messageEvent = new MessageEvent('message', {
    data,
    origin,
  });
  window.dispatchEvent(messageEvent);
}

const popupLoadedMessage = {
  data: { event: 'PopupLoaded' },
};

/**
 * Queues a message event to be dispatched after a delay.
 *
 * This is used to simulate messages dispatched by the popup. Because there is
 * no event emitted by the SDK to denote whether it's ready to receive, this
 * leverages a simple timeout of 200ms.
 */
function queueMessageEvent({
  data,
  origin = new URL(CB_KEYS_URL).origin,
}: {
  data: Record<string, any>;
  origin?: string;
}) {
  setTimeout(() => dispatchMessageEvent({ data, origin }), 200);
}

describe('Communicator', () => {
  let urlOrigin: string;
  let communicator: Communicator;
  let mockPopup: Pick<Exclude<Communicator['popup'], null>, 'postMessage' | 'close'>;

  beforeEach(() => {
    jest.clearAllMocks();

    // url defaults to CB_KEYS_URL
    communicator = new Communicator();
    urlOrigin = new URL(CB_KEYS_URL).origin;

    mockPopup = {
      postMessage: jest.fn(),
      close: jest.fn(),
    } as unknown as Window;
    (openPopup as jest.Mock).mockImplementation(() => mockPopup);
  });

  it('should open a popup window', async () => {
    queueMessageEvent(popupLoadedMessage);

    // @ts-expect-error accessing private method
    await communicator.waitForPopupLoaded();

    expect(openPopup).toHaveBeenCalledWith(new URL(CB_KEYS_URL));
    expect(mockPopup.postMessage).toHaveBeenCalledWith(
      {
        data: {
          version: LIB_VERSION,
        },
      },
      urlOrigin
    );
  });

  it('should post a message to the popup window', async () => {
    const mockRequest: Message = { id: 'mock-request-id-1-2', data: {} };

    queueMessageEvent(popupLoadedMessage);
    queueMessageEvent({
      data: {
        requestId: mockRequest.id,
      },
    });

    await communicator.postMessage(mockRequest);

    expect(mockPopup.postMessage).toHaveBeenNthCalledWith(
      1,
      {
        data: {
          version: LIB_VERSION,
        },
      },
      urlOrigin
    );
    expect(mockPopup.postMessage).toHaveBeenNthCalledWith(2, mockRequest, urlOrigin);
  });

  describe('postRPCRequest', () => {
    const request1 = { id: 'mock-request-id-1-1', data: {} } as unknown as RPCRequestMessage;
    const request2 = { id: 'mock-request-id-2-2', data: {} } as unknown as RPCRequestMessage;
    const simulateAsyncCall = () => new Promise((resolve) => setTimeout(resolve, 10));

    let postMessageSpy: jest.SpyInstance;
    let disconnectSpy: jest.SpyInstance;

    beforeEach(() => {
      queueMessageEvent(popupLoadedMessage);

      disconnectSpy = jest.spyOn(communicator, 'disconnect');
      postMessageSpy = jest
        .spyOn(communicator, 'postMessage')
        .mockImplementation(async (message: Message) => {
          await simulateAsyncCall();
          queueMessageEvent({
            data: {
              requestId: message.id,
            },
          });
        });
    });

    describe('single request', () => {
      it('should call disconnect immediately when single request resolves', async () => {
        const response = await communicator.postRPCRequest(request1);
        expect(response.requestId).toBe(request1.id);
        expect(postMessageSpy).toHaveBeenCalledWith(request1);
        expect(disconnectSpy).not.toHaveBeenCalled();

        return simulateAsyncCall().then(() => {
          expect(disconnectSpy).toHaveBeenCalledTimes(1);
        });
      });

      it('should call disconnect immediately when single request rejects', async () => {
        postMessageSpy = jest
          .spyOn(communicator, 'postMessage')
          .mockRejectedValue(new Error('mock error'));

        await expect(communicator.postRPCRequest(request1)).rejects.toThrow('mock error');
        expect(postMessageSpy).toHaveBeenCalledWith(request1);
        expect(communicator.disconnect).toHaveBeenCalled();
      });

      it('should reject if popup disconnects before posting request', async () => {
        const promise = communicator.postRPCRequest(request1);
        expect(postMessageSpy).not.toHaveBeenCalledWith(request1);
        expect(communicator.disconnect).not.toHaveBeenCalled();

        // close the popup
        communicator.disconnect();

        await expect(promise).rejects.toThrow('Request cancelled before sending');
      });

      it('should reject if popup disconnects while waiting for response', async () => {
        // no dispatchMessageEvent simulation so that the request is never resolved
        postMessageSpy = jest.spyOn(communicator, 'postMessage').mockResolvedValue();

        const promise = communicator.postRPCRequest(request1);
        expect(postMessageSpy).not.toHaveBeenCalledWith(request1);
        expect(communicator.disconnect).not.toHaveBeenCalled();

        // close the popup after a delay
        setTimeout(() => communicator.disconnect(), 100);

        await expect(promise).rejects.toThrow('Request cancelled before response');
      });
    });

    describe('multiple requests', () => {
      it('should call disconnect only once for back to back requests', async () => {
        const response1 = await communicator.postRPCRequest(request1);
        const response2 = await communicator.postRPCRequest(request2);

        return simulateAsyncCall().then(() => {
          expect(response1.requestId).toBe(request1.id);
          expect(response2.requestId).toBe(request2.id);
          expect(disconnectSpy).toHaveBeenCalledTimes(1);
        });
      });

      it('should call disconnect only when no more requests are pending', async () => {
        const response = await communicator.postRPCRequest(request1);
        expect(response.requestId).toBe(request1.id);
        expect(postMessageSpy).toHaveBeenCalledWith(request1);
        expect(communicator.disconnect).not.toHaveBeenCalled();

        const secondPromise = communicator.postRPCRequest(request2);
        expect(communicator.disconnect).not.toHaveBeenCalled();

        return secondPromise.then(async (response2) => {
          await simulateAsyncCall();
          expect(response2.requestId).toBe(request2.id);
          expect(postMessageSpy).toHaveBeenCalledWith(request2);
          expect(communicator.disconnect).toHaveBeenCalledTimes(1);
        });
      });

      it('should reject all pending requests if popup disconnects before posting them', async () => {
        const promise1 = communicator.postRPCRequest(request1);
        const promise2 = communicator.postRPCRequest(request2);

        expect(postMessageSpy).not.toHaveBeenCalledWith(request1);
        expect(postMessageSpy).not.toHaveBeenCalledWith(request2);
        expect(communicator.disconnect).not.toHaveBeenCalled();

        // close the popup
        communicator.disconnect();

        await expect(promise1).rejects.toThrow('Request cancelled before sending');
        await expect(promise2).rejects.toThrow('Request cancelled before sending');
      });
    });
  });
});
