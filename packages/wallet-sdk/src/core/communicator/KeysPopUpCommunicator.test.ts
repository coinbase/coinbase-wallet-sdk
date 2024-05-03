import { LIB_VERSION } from '../../version';
import { Message } from '../message';
import { KeysPopupCommunicator } from './KeysPopupCommunicator';
import { openPopup } from './PopUpCommunicator';
import { CB_KEYS_URL } from ':core/constants';

jest.mock('./PopUpCommunicator', () => ({
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

// Dispatches an event indicating that the popup has loaded
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

describe('KeysPopupCommunicator', () => {
  let urlOrigin: string;
  let communicator: KeysPopupCommunicator;
  let mockPopup: Pick<Exclude<KeysPopupCommunicator['popup'], null>, 'postMessage' | 'close'>;

  beforeEach(() => {
    jest.clearAllMocks();

    // url defaults to CB_KEYS_URL
    communicator = new KeysPopupCommunicator();
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
});
