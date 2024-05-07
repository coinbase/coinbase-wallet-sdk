import { LIB_VERSION } from '../../version';
import {
  ConfigMessage,
  Message,
  MessageID,
  RPCRequestMessage,
  RPCResponseMessage,
} from '../message';
import { closePopup, openPopup } from './util';
import { CB_KEYS_URL } from ':core/constants';
import { standardErrors } from ':core/error';

type RequestStatus = 'created' | 'awaiting';

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
  private popup: Window | null = null;
  private listeners = new Map<(_: MessageEvent) => void, { cleanup: () => void }>();
  private pendingRequests = new Map<MessageID, RequestStatus>();

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
      this.listeners.set(listener, {
        cleanup: () => {
          window.removeEventListener('message', listener);
          reject(standardErrors.rpc.internal('Message listener cancelled'));
        },
      });
    });
  };

  /**
   * Rejects pending requests, closes the popup window and clears the listeners
   */
  disconnect = () => {
    this.pendingRequests.forEach((status, id) => {
      // cancel pending request promises that are not awaiting a response
      if (status !== 'awaiting') {
        this.pendingRequests.delete(id);
      }
    });

    closePopup(this.popup);
    this.popup = null;

    this.listeners.forEach(({ cleanup }) => cleanup());
    this.listeners.clear();
  };

  /**
   * Waits for the popup window to fully load and then sends a version message.
   */
  private waitForPopupLoaded = async (): Promise<Window> => {
    if (this.popup) return this.popup;

    this.popup = openPopup(this.url);

    this.onMessage<ConfigMessage>(({ event }) => event === 'PopupUnload')
      .then(() => this.disconnect())
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

  /**
   * Posts a RPC request to the popup window and waits for a response
   */
  postRPCRequest = (request: RPCRequestMessage): Promise<RPCResponseMessage> => {
    this.pendingRequests.set(request.id, 'created');

    return new Promise((resolve, reject) => {
      // reject if the request was cancelled between creation and awaiting due to disconnect
      if (!this.pendingRequests.has(request.id)) {
        reject(standardErrors.provider.userRejectedRequest());
        return;
      }

      // otherwise, post the message and wait for a response
      this.pendingRequests.set(request.id, 'awaiting');
      this.postMessage(request)
        .then(() => this.onMessage<RPCResponseMessage>(({ requestId }) => requestId === request.id))
        .then(resolve) // resolve the outer promise first, to take follow-up requests if needed
        .catch(reject)
        .finally(() => {
          // then clean up the pending request and disconnect if no more requests are pending
          this.pendingRequests.delete(request.id);
          if (this.pendingRequests.size === 0) {
            this.disconnect();
          }
        });
    });
  };
}
