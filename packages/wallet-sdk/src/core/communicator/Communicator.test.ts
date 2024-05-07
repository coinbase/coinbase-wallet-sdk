import { LIB_VERSION } from '../../version';
import { Message, RPCRequestMessage } from '../message';
import { Communicator } from './Communicator';
import { openPopup } from './util';
import { CB_KEYS_URL } from ':core/constants';

jest.mock('./util', () => ({
  openPopup: jest.fn(),
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

  describe('postMessageToPopup', () => {
    function wait(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    beforeEach(() => {
      communicator.disconnect = jest.fn();
      communicator.postMessage = jest.fn().mockImplementation(() => Promise.resolve());
      communicator.onMessage = jest.fn().mockImplementation(() => wait(100));
    });

    it('should call disconnect immediately when single request resolves', async () => {
      const request = { id: 'mock-request-id-1-1', data: {} } as unknown as RPCRequestMessage;

      await communicator.postRPCRequest(request);
      expect(communicator.postMessage).toHaveBeenCalledWith(request);
      expect(communicator.disconnect).not.toHaveBeenCalled();

      await wait(10);
      expect(communicator.disconnect).toHaveBeenCalled();
    });

    it('should call disconnect immediately when single request rejects', async () => {
      communicator.postMessage = jest.fn().mockRejectedValue(new Error('mock error'));
      const request = { id: 'mock-request-id-1-1', data: {} } as unknown as RPCRequestMessage;

      await expect(communicator.postRPCRequest(request)).rejects.toThrow('mock error');
      expect(communicator.postMessage).toHaveBeenCalledWith(request);
      expect(communicator.disconnect).toHaveBeenCalled();
    });

    it('should not call disconnect when previous request succeeds if there are pending requests', async () => {
      const request1 = { id: 'mock-request-id-1-1', data: {} } as unknown as RPCRequestMessage;
      const request2 = { id: 'mock-request-id-2-2', data: {} } as unknown as RPCRequestMessage;

      await communicator.postRPCRequest(request1);
      expect(communicator.postMessage).toHaveBeenCalledWith(request1);
      expect(communicator.disconnect).not.toHaveBeenCalled();

      const secondPromise = communicator.postRPCRequest(request2);
      expect(communicator.postMessage).toHaveBeenCalledWith(request2);
      expect(communicator.disconnect).not.toHaveBeenCalled();

      return secondPromise
        .then(() => wait(10))
        .then(() => {
          expect(communicator.disconnect).toHaveBeenCalled();
        });
    });
  });
});
