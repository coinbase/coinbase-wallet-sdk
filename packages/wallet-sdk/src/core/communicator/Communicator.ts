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
  private requestQueue: Promise<unknown> = Promise.resolve();

  constructor(url: string = CB_KEYS_URL) {
    this.url = new URL(url);
    this.postMessage = this.postMessage.bind(this);
    this.postRPCRequest = this.postRPCRequest.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.close = this.close.bind(this);
  }

  /**
   * Posts a message to the popup window
   */
  async postMessage(message: Message) {
    const popup = await this.waitForPopupLoaded();
    popup.postMessage(message, this.url.origin);
  }

  /**
   * Posts a RPC request to the popup window and waits for a response
   */
  async postRPCRequest(request: RPCRequestMessage): Promise<RPCResponseMessage> {
    return (this.requestQueue = this.requestQueue
      .then(async () => {
        await this.postMessage(request);
        const response: RPCResponseMessage = await this.onMessage(
          ({ requestId }) => requestId === request.id
        );
        return response;
      })
      .finally(() => {
        // unless FE popup supports batch requests, close the popup after each request
        // this.close();
      }));
  }

  /**
   * Listens for messages from the popup window that match a given predicate.
   */
  async onMessage<M extends Message>(predicate: (_: Partial<M>) => boolean): Promise<M> {
    return new Promise((resolve, reject) => {
      const listener = (event: MessageEvent<M>) => {
        if (event.origin !== this.url.origin) return; // origin validation
        const message = event.data;
        if (predicate(message)) {
          resolve(message);
          window.removeEventListener('message', listener);
        }
      };
      window.addEventListener('message', listener);

      const removeListener = () => {
        window.removeEventListener('message', listener);
        reject(standardErrors.provider.userRejectedRequest('Request rejected'));
      };
      this.pendingRemoveListeners.push(removeListener);
    });
  }

  private pendingRemoveListeners = new Array<() => void>();

  /**
   * Close the popup window, rejects all requests and clears the listeners
   */
  close() {
    closePopup(this.popup);
    this.popup = null;

    for (const removeListener of this.pendingRemoveListeners) {
      removeListener();
    }
    this.pendingRemoveListeners = [];
  }

  private popup: Window | null = null;

  /**
   * Waits for the popup window to fully load and then sends a version message.
   */
  private async waitForPopupLoaded(): Promise<Window> {
    if (this.popup) return this.popup;

    this.popup = openPopup(this.url);

    this.onMessage<ConfigMessage>(({ event }) => event === 'PopupUnload').then(() => {
      this.close();
    });

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
  }
}
