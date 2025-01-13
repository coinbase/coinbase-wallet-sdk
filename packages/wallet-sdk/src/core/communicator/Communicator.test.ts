import { Mock, vi } from 'vitest';

import { AppMetadata, Preference } from 'src/index.js';

import { VERSION } from '../../sdk-info.js';
import { Message, MessageID } from '../message/Message.js';
import { Communicator } from './Communicator.js';
import { CB_KEYS_URL } from ':core/constants.js';
import { openPopup } from ':util/web.js';

vi.mock(':util/web', () => ({
  openPopup: vi.fn(),
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

const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

const appMetadata: AppMetadata = {
  appName: 'Test App',
  appLogoUrl: null,
  appChainIds: [1],
};

const preference: Preference = { keysUrl: CB_KEYS_URL, options: 'all' };

describe('Communicator', () => {
  let urlOrigin: string;
  let communicator: Communicator;
  let mockPopup: Pick<
    Exclude<Communicator['popup'], null>,
    'postMessage' | 'close' | 'closed' | 'focus'
  >;

  beforeEach(() => {
    vi.clearAllMocks();

    // url defaults to CB_KEYS_URL
    communicator = new Communicator({
      url: CB_KEYS_URL,
      metadata: appMetadata,
      preference,
    });
    urlOrigin = new URL(CB_KEYS_URL).origin;

    mockPopup = {
      postMessage: vi.fn(),
      close: vi.fn(),
      closed: false,
      focus: vi.fn(),
    } as unknown as Window;
    (openPopup as Mock).mockImplementation(() => mockPopup);
  });

  describe('onMessage', () => {
    it('should add and remove event listener', async () => {
      const mockRequest: Message = {
        requestId: 'mock-request-id-1-2',
        data: 'test',
      };

      queueMessageEvent({ data: mockRequest });

      const promise = communicator.onMessage(() => true);

      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
      expect(await promise).toEqual(mockRequest);
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('postRequestAndWaitForResponse', () => {
    it('should post a message to the popup window and wait for response', async () => {
      const mockRequest: Message & { id: MessageID } = { id: 'mock-request-id-1-2', data: {} };

      queueMessageEvent(popupLoadedMessage);
      queueMessageEvent({
        data: {
          requestId: mockRequest.id,
        },
      });

      const response = await communicator.postRequestAndWaitForResponse(mockRequest);

      expect(mockPopup.postMessage).toHaveBeenNthCalledWith(
        1,
        {
          data: {
            version: VERSION,
            metadata: appMetadata,
            preference,
            location: 'http://localhost:3000/',
          },
        },
        urlOrigin
      );
      expect(mockPopup.postMessage).toHaveBeenNthCalledWith(2, mockRequest, urlOrigin);

      expect(response).toEqual({
        requestId: mockRequest.id,
      });
    });
  });

  describe('postMessage', () => {
    it('should post a response to the popup window', async () => {
      const mockResponse: Message = { requestId: 'mock-request-id-1-2', data: {} };

      queueMessageEvent(popupLoadedMessage);

      await communicator.postMessage(mockResponse);

      expect(mockPopup.postMessage).toHaveBeenNthCalledWith(
        1,
        {
          data: {
            version: VERSION,
            metadata: appMetadata,
            preference,
            location: 'http://localhost:3000/',
          },
        },
        urlOrigin
      );
      expect(mockPopup.postMessage).toHaveBeenNthCalledWith(2, mockResponse, urlOrigin);
    });
  });

  describe('waitForPopupLoaded', () => {
    it('should open a popup window and finish handshake', async () => {
      queueMessageEvent(popupLoadedMessage);

      const popup = await communicator.waitForPopupLoaded();

      expect(openPopup).toHaveBeenCalledWith(new URL(CB_KEYS_URL));
      expect(mockPopup.postMessage).toHaveBeenNthCalledWith(
        1,
        {
          data: {
            version: VERSION,
            metadata: appMetadata,
            preference,
            location: 'http://localhost:3000/',
          },
        },
        urlOrigin
      );
      expect(popup).toBeTruthy();
    });

    it('should re-focus and return the existing popup window if one is already open.', async () => {
      mockPopup = {
        postMessage: vi.fn(),
        close: vi.fn(),
        closed: false,
        focus: vi.fn(),
      } as unknown as Window;
      (openPopup as Mock).mockImplementationOnce(() => mockPopup);

      queueMessageEvent(popupLoadedMessage);
      await communicator.waitForPopupLoaded();

      expect(mockPopup.focus).toHaveBeenCalledTimes(1);
      expect(openPopup).toHaveBeenCalledTimes(1);
    });

    it('should open a popup window if an existing one is defined but closed', async () => {
      mockPopup = {
        postMessage: vi.fn(),
        close: vi.fn(),
        // Simulate the popup being closed
        closed: true,
      } as unknown as Window;
      (openPopup as Mock).mockImplementationOnce(() => mockPopup);

      queueMessageEvent(popupLoadedMessage);
      await communicator.waitForPopupLoaded();

      expect(openPopup).toHaveBeenCalledTimes(2);
    });
  });
});
