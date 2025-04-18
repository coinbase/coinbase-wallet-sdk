import { VERSION } from '../../sdk-info.js';
import { ConfigMessage } from '../message/ConfigMessage.js';
import { Message, MessageID } from '../message/Message.js';
import { CB_KEYS_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { AppMetadata, Preference } from ':core/provider/interface.js';
import { closePopup, openPopup } from ':util/web.js';

export type CommunicatorOptions = {
  url?: string;
  metadata: AppMetadata;
  preference: Preference;
};

/**
 * Communicates with a popup window for Coinbase keys.coinbase.com (or another url)
 * to send and receive messages.
 *
 * This class is responsible for opening a popup window, posting messages to it,
 * and listening for responses.
 *
 * It also handles cleanup of event listeners and the popup window itself when necessary.
 */
export class Communicator {
  private readonly metadata: AppMetadata;
  private readonly preference: Preference;
  private readonly url: URL;
  private popup: Window | null = null;
  private listeners = new Map<(_: MessageEvent) => void, { reject: (_: Error) => void }>();

  constructor({ url = CB_KEYS_URL, metadata, preference }: CommunicatorOptions) {
    this.url = new URL(url);
    this.metadata = metadata;
    this.preference = preference;
  }

  /**
   * Posts a message to the popup window
   */
  postMessage = async (message: Message) => {
    const popup = await this.waitForPopupLoaded();
    popup.postMessage(message, this.url.origin);
  };

  /**
   * Posts a request to the popup window and waits for a response
   */
  postRequestAndWaitForResponse = async <M extends Message>(
    request: Message & { id: MessageID }
  ): Promise<M> => {
    const responsePromise = this.onMessage<M>(({ requestId }) => requestId === request.id);
    this.postMessage(request);
    return await responsePromise;
  };

  /**
   * Listens for messages from the popup window that match a given predicate.
   */
  onMessage = async <M extends Message>(predicate: (_: Partial<M>) => boolean): Promise<M> => {
    return new Promise((resolve, reject) => {
      const listener = (event: MessageEvent<M>) => {
        if (event.origin !== this.url.origin) return; // origin validation

        const message = event.data;
        if (predicate(message)) {
          resolve(message);
          window.removeEventListener('message', listener);
          this.listeners.delete(listener);
        }
      };

      window.addEventListener('message', listener);
      this.listeners.set(listener, { reject });
    });
  };

  /**
   * Closes the popup, rejects all requests and clears the listeners
   */
  private disconnect = () => {
    // Note: keys popup handles closing itself. this is a fallback.
    closePopup(this.popup);
    this.popup = null;

    this.listeners.forEach(({ reject }, listener) => {
      reject(standardErrors.provider.userRejectedRequest('Request rejected'));
      window.removeEventListener('message', listener);
    });
    this.listeners.clear();
  };

  /**
   * Waits for the popup window to fully load and then sends a version message.
   */
  waitForPopupLoaded = async (): Promise<Window> => {
    if (this.popup && !this.popup.closed) {
      // In case the user un-focused the popup between requests, focus it again
      this.popup.focus();
      return this.popup;
    }

    this.popup = await openPopup(this.url);

    this.onMessage<ConfigMessage>(({ event }) => event === 'PopupUnload')
      .then(this.disconnect)
      .catch(() => {});

    return this.onMessage<ConfigMessage>(({ event }) => event === 'PopupLoaded')
      .then((message) => {
        this.postMessage({
          requestId: message.id,
          data: {
            version: VERSION,
            metadata: this.metadata,
            preference: this.preference,
            location: window.location.toString(),
          },
        });
      })
      .then(() => {
        if (!this.popup) throw standardErrors.rpc.internal();
        return this.popup;
      });
  };
}
