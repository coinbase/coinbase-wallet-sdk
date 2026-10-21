import { CB_KEYS_URL, PACKAGE_NAME, PACKAGE_VERSION } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import {
  logPopupSetupCompleted,
  logPopupSetupStarted,
  logPopupUnloadReceived,
} from ':core/telemetry/events/communicator.js';
import { closePopup, openPopup, type OpenFn } from ':util/web.js';

import { ConfigMessage, PopupSetupV2Message } from ':core/message/ConfigMessage.js';
import { Message, MessageID } from ':core/message/Message.js';
import type { AppMetadata, Preference } from '../../../storage/schema.js';

export type CommunicatorOptions = {
  url?: string;
  metadata: AppMetadata;
  preference: Preference;
  openFn?: OpenFn;
};

/**
 * Popup window I/O via `window.postMessage`, restricted to `targetOrigin`.
 *
 * Opens the keys popup, posts handshake and encrypted RPC messages, and waits
 * for replies. Used by `createPopup`.
 */
export class Communicator {
  private readonly metadata: AppMetadata;
  private readonly preference: Preference;
  private readonly url: URL;
  private readonly openFn?: OpenFn;
  private popup: Window | null = null;
  private listeners = new Map<(_: MessageEvent) => void, { reject: (_: Error) => void }>();

  constructor({ url = CB_KEYS_URL, metadata, preference, openFn }: CommunicatorOptions) {
    this.url = new URL(url);
    this.metadata = metadata;
    this.preference = preference;
    this.openFn = openFn;
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
   * Waits for the protocol-v2 popup and sends fixed v2 setup metadata.
   */
  waitForPopupLoaded = async (): Promise<Window> => {
    if (this.popup && !this.popup.closed) {
      // In case the user un-focused the popup between requests, focus it again
      this.popup.focus();
      return this.popup;
    }

    logPopupSetupStarted();
    this.popup = await openPopup(this.url, this.openFn);

    this.onMessage<ConfigMessage>(({ event }) => event === 'PopupUnload')
      .then(() => {
        this.disconnect();
        logPopupUnloadReceived();
      })
      .catch(() => {});

    return this.onMessage<ConfigMessage>(({ event }) => event === 'PopupLoadedV2')
      .then((message) => {
        if (!message.id) throw standardErrors.rpc.invalidRequest('PopupLoadedV2 is missing id');
        const setup: PopupSetupV2Message = {
          event: 'PopupSetupV2',
          requestId: message.id,
          data: {
            version: PACKAGE_VERSION,
            sdkName: PACKAGE_NAME,
            protocolVersion: 2,
            metadata: this.metadata,
            preference: this.preference,
            location: window.location.toString(),
          },
        };
        this.postMessage(setup);
      })
      .then(() => {
        if (!this.popup) throw standardErrors.rpc.internal();
        logPopupSetupCompleted();
        return this.popup;
      });
  };
}
