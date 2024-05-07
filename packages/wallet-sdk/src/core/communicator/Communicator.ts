import { LIB_VERSION } from '../../version';
import { ConfigMessage, Message, RPCRequestMessage, RPCResponseMessage } from '../message';
import { closePopup, openPopup } from './util';
import { CB_KEYS_URL } from ':core/constants';
import { standardErrors } from ':core/error';

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
  private readonly url: URL;

  constructor(url: string = CB_KEYS_URL) {
    this.url = new URL(url);
  }

  /**
   * Posts a message to the popup window
   */
  postMessage = async (message: Message) => {
    const popup = await this.waitForPopupLoaded();
    popup.postMessage(message, this.url.origin);
  };

  private pendingRequestsCount = 0;
  private requestQueue: Promise<unknown> = Promise.resolve();
  /**
   * Posts a RPC request to the popup window and waits for a response
   */
  postRPCRequest = async (request: RPCRequestMessage): Promise<RPCResponseMessage> => {
    this.pendingRequestsCount++;

    return (this.requestQueue = this.requestQueue
      .then(async () => {
        await this.postMessage(request);
        return await this.onMessage<RPCResponseMessage>(
          ({ requestId }) => requestId === request.id
        );
      })
      .finally(() => {
        this.pendingRequestsCount--;
        if (this.pendingRequestsCount === 0) {
          this.close();
        }
      }));
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
          window.removeEventListener('message', listener);
          this.listeners.delete(listener);
          resolve(message);
        }
      };

      window.addEventListener('message', listener);
      this.listeners.set(listener, { reject });
    });
  };

  private listeners = new Map<(_: MessageEvent) => void, { reject: (_: Error) => void }>();

  /**
   * Close the popup window, rejects all requests and clears the listeners
   */
  close = () => {
    closePopup(this.popup);
    this.popup = null;

    this.listeners.forEach(({ reject }, listener) => {
      window.removeEventListener('message', listener);
      reject(standardErrors.provider.userRejectedRequest('Request rejected'));
    });
    this.listeners.clear();
  };

  private popup: Window | null = null;

  /**
   * Waits for the popup window to fully load and then sends a version message.
   */
  private waitForPopupLoaded = async (): Promise<Window> => {
    if (this.popup) return this.popup;

    this.popup = openPopup(this.url);

    this.onMessage<ConfigMessage>(({ event }) => event === 'PopupUnload')
      .then(() => this.close())
      .catch(() => {});

    return this.onMessage<ConfigMessage>(({ event }) => event === 'PopupLoaded')
      .then((message) => {
        this.postMessage({
          requestId: message.id,
          data: { version: LIB_VERSION },
        });
      })
      .then(() => {
        if (!this.popup) throw standardErrors.rpc.internal();
        return this.popup;
      });
  };
}
