// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import {
  logWalletLinkConnectionConnectionFailed,
  logWalletLinkConnectionFetchUnseenEventsFailed,
} from ':core/telemetry/events/walletlink-signer.js';
import { IntNumber } from ':core/type/index.js';
import { APP_VERSION_KEY, WALLET_USER_NAME_KEY } from '../constants.js';
import { ClientMessage } from '../type/ClientMessage.js';
import { ServerMessage, ServerMessageType } from '../type/ServerMessage.js';
import { WalletLinkEventData } from '../type/WalletLinkEventData.js';
import { WalletLinkSession } from '../type/WalletLinkSession.js';
import { Web3Response } from '../type/Web3Response.js';
import { WalletLinkCipher } from './WalletLinkCipher.js';
import { WalletLinkHTTP } from './WalletLinkHTTP.js';
import { ConnectionState, WalletLinkWebSocket } from './WalletLinkWebSocket.js';

const HEARTBEAT_INTERVAL = 10000;
const REQUEST_TIMEOUT = 60000;

export interface WalletLinkConnectionUpdateListener {
  linkedUpdated: (linked: boolean) => void;
  handleWeb3ResponseMessage: (id: string, response: Web3Response) => void;
  chainUpdated: (chainId: string, jsonRpcUrl: string) => void;
  accountUpdated: (selectedAddress: string) => void;
  metadataUpdated: (key: string, metadataValue: string) => void;
  resetAndReload: () => void;
}

interface WalletLinkConnectionParams {
  session: WalletLinkSession;
  linkAPIUrl: string;
  listener: WalletLinkConnectionUpdateListener;
}

/**
 * Coinbase Wallet Connection
 */
export class WalletLinkConnection {
  private destroyed = false;
  private lastHeartbeatResponse = 0;
  private nextReqId = IntNumber(1);
  private heartbeatIntervalId?: number;
  private reconnectAttempts = 0;
  private visibilityChangeHandler?: () => void;
  private focusHandler?: () => void;
  private activeWsInstance?: WalletLinkWebSocket;
  private isReconnecting = false;

  private readonly session: WalletLinkSession;

  private listener?: WalletLinkConnectionUpdateListener;
  private cipher: WalletLinkCipher;
  private ws: WalletLinkWebSocket;
  private http: WalletLinkHTTP;
  private readonly linkAPIUrl: string;
  private readonly WebSocketClass: typeof WebSocket;

  /**
   * Constructor
   * @param session Session
   * @param linkAPIUrl Coinbase Wallet link server URL
   * @param listener WalletLinkConnectionUpdateListener
   * @param [WebSocketClass] Custom WebSocket implementation
   */
  constructor({ session, linkAPIUrl, listener }: WalletLinkConnectionParams) {
    this.session = session;
    this.cipher = new WalletLinkCipher(session.secret);
    this.listener = listener;
    this.linkAPIUrl = linkAPIUrl;
    this.WebSocketClass = WebSocket;

    const ws = this.createWebSocket();
    this.ws = ws;

    this.http = new WalletLinkHTTP(linkAPIUrl, session.id, session.key);

    this.setupVisibilityChangeHandler();
  }

  private createWebSocket(): WalletLinkWebSocket {
    const ws = new WalletLinkWebSocket(`${this.linkAPIUrl}/rpc`, this.WebSocketClass);

    // Track this as the active WebSocket instance
    this.activeWsInstance = ws;

    ws.setConnectionStateListener(async (state) => {
      // Ignore events from non-active WebSocket instances
      if (ws !== this.activeWsInstance) {
        return;
      }

      // attempt to reconnect every 5 seconds when disconnected
      let connected = false;
      switch (state) {
        case ConnectionState.DISCONNECTED:
          // Clear heartbeat timer when disconnected
          if (this.heartbeatIntervalId) {
            clearInterval(this.heartbeatIntervalId);
            this.heartbeatIntervalId = undefined;
          }

          // Reset lastHeartbeatResponse to prevent false timeout on reconnection
          this.lastHeartbeatResponse = 0;

          // Reset connected state to false on disconnect
          connected = false;

          // if DISCONNECTED and not destroyed, create a fresh WebSocket connection
          if (!this.destroyed) {
            const reconnect = async () => {
              // Prevent multiple concurrent reconnection attempts
              if (this.isReconnecting) {
                return;
              }

              this.isReconnecting = true;

              // 0 second delay on first attempt, then 3 seconds
              const delay = this.reconnectAttempts === 0 ? 0 : 3000;

              // wait before reconnecting
              await new Promise((resolve) => setTimeout(resolve, delay));

              // check whether it's destroyed again and ensure this is still the active instance
              if (!this.destroyed && ws === this.activeWsInstance) {
                this.reconnectAttempts++;

                // Clean up the old WebSocket instance
                if ('cleanup' in this.ws && typeof this.ws.cleanup === 'function') {
                  this.ws.cleanup();
                }

                // Create a fresh WebSocket instance
                this.ws = this.createWebSocket();
                this.ws
                  .connect()
                  .catch(() => {
                    // Reconnection failed, will retry
                    logWalletLinkConnectionConnectionFailed();
                  })
                  .finally(() => {
                    this.isReconnecting = false;
                  });
              } else {
                this.isReconnecting = false;
              }
            };
            reconnect();
          }
          break;

        case ConnectionState.CONNECTED:
          // Reset reconnect attempts on successful connection
          this.reconnectAttempts = 0;

          // perform authentication upon connection
          try {
            // if CONNECTED, authenticate, and then check link status
            connected = await this.handleConnected();

            // Always fetch unseen events when WebSocket state changes to CONNECTED
            this.fetchUnseenEventsAPI().catch(() => {
              // Failed to fetch unseen events after connection
            });
          } catch (_error) {
            // Don't set connected to true if authentication fails
            break;
          }

          // Update connected state immediately after successful authentication
          // This ensures heartbeats won't be skipped
          this.connected = connected;

          // send heartbeat every n seconds while connected
          // if CONNECTED, start the heartbeat timer
          // first timer event updates lastHeartbeat timestamp
          // subsequent calls send heartbeat message
          this.updateLastHeartbeat();

          // Clear existing heartbeat timer
          if (this.heartbeatIntervalId) {
            clearInterval(this.heartbeatIntervalId);
          }

          this.heartbeatIntervalId = window.setInterval(() => {
            this.heartbeat();
          }, HEARTBEAT_INTERVAL);

          // Send an immediate heartbeat
          setTimeout(() => {
            this.heartbeat();
          }, 100);

          break;

        case ConnectionState.CONNECTING:
          break;
      }

      // Update connected state for DISCONNECTED and CONNECTING cases
      // For CONNECTED case, it's already set above
      if (state !== ConnectionState.CONNECTED) {
        this.connected = connected;
      }
    });

    ws.setIncomingDataListener((m) => {
      switch (m.type) {
        // handle server's heartbeat responses
        case 'Heartbeat':
          this.updateLastHeartbeat();
          return;

        // handle link status updates
        case 'IsLinkedOK':
        case 'Linked': {
          const linked = m.type === 'IsLinkedOK' ? m.linked : undefined;
          this.linked = linked || m.onlineGuests > 0;
          break;
        }

        // handle session config updates
        case 'GetSessionConfigOK':
        case 'SessionConfigUpdated': {
          this.handleSessionMetadataUpdated(m.metadata);
          break;
        }

        case 'Event': {
          this.handleIncomingEvent(m);
          break;
        }
      }

      // resolve request promises
      if (m.id !== undefined) {
        this.requestResolutions.get(m.id)?.(m);
      }
    });

    return ws;
  }

  private setupVisibilityChangeHandler(): void {
    this.visibilityChangeHandler = () => {
      if (!document.hidden && !this.destroyed) {
        if (!this.connected) {
          // Force a fresh connection if we're disconnected
          this.reconnectWithFreshWebSocket();
        } else {
          // Otherwise send a heartbeat to check if connection is still alive
          this.heartbeat();
        }
      }
    };

    // Handle focus events (when user switches back to the tab/app)
    this.focusHandler = () => {
      if (!this.destroyed && !this.connected) {
        this.reconnectWithFreshWebSocket();
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    window.addEventListener('focus', this.focusHandler);

    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        if (this.focusHandler) {
          this.focusHandler();
        }
      }
    });
  }

  private reconnectWithFreshWebSocket(): void {
    if (this.destroyed) return;

    // Clear the active instance reference before disconnecting
    const oldWs = this.ws;
    this.activeWsInstance = undefined;

    // Disconnect current WebSocket
    oldWs.disconnect();

    // Clean up the old instance
    if ('cleanup' in oldWs && typeof oldWs.cleanup === 'function') {
      oldWs.cleanup();
    }

    // Create and connect fresh WebSocket
    this.ws = this.createWebSocket();
    this.ws.connect().catch(() => {
      // Fresh reconnection failed
      logWalletLinkConnectionConnectionFailed();
    });
  }

  /**
   * Make a connection to the server
   */
  public connect(): void {
    if (this.destroyed) {
      throw new Error('instance is destroyed');
    }
    this.ws.connect();
  }

  /**
   * Terminate connection, and mark as destroyed. To reconnect, create a new
   * instance of WalletSDKConnection
   */
  public async destroy() {
    if (this.destroyed) return;

    await this.makeRequest(
      {
        type: 'SetSessionConfig',
        id: IntNumber(this.nextReqId++),
        sessionId: this.session.id,
        metadata: { __destroyed: '1' },
      },
      { timeout: 1000 }
    );

    this.destroyed = true;

    // Clear the active instance reference
    this.activeWsInstance = undefined;

    // Clear heartbeat timer
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = undefined;
    }

    // Remove event listeners
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
    }

    this.ws.disconnect();

    // Call cleanup on the WebSocket instance if it has the method
    if ('cleanup' in this.ws && typeof this.ws.cleanup === 'function') {
      this.ws.cleanup();
    }

    this.listener = undefined;
  }

  /**
   * true if connected and authenticated, else false
   * runs listener when connected status changes
   */
  private _connected = false;
  private get connected(): boolean {
    return this._connected;
  }
  private set connected(connected: boolean) {
    this._connected = connected;
  }
  /**
   * true if linked (a guest has joined before)
   * runs listener when linked status changes
   */
  private _linked = false;
  private get linked(): boolean {
    return this._linked;
  }
  private set linked(linked: boolean) {
    this._linked = linked;
    if (linked) this.onceLinked?.();
    this.listener?.linkedUpdated(linked);
  }

  /**
   * Execute once when linked
   */
  private onceLinked?: () => void;
  private setOnceLinked<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve) => {
      if (this.linked) {
        callback().then(resolve);
      } else {
        this.onceLinked = () => {
          callback().then(resolve);
          this.onceLinked = undefined;
        };
      }
    });
  }

  private async handleIncomingEvent(m: ServerMessage) {
    if (m.type !== 'Event' || m.event !== 'Web3Response') {
      return;
    }

    try {
      const decryptedData = await this.cipher.decrypt(m.data);
      const message: WalletLinkEventData = JSON.parse(decryptedData);

      if (message.type !== 'WEB3_RESPONSE') return;

      this.listener?.handleWeb3ResponseMessage(message.id, message.response);
    } catch (_error) {
      // Had error decrypting
    }
  }

  public async checkUnseenEvents() {
    // Add a small delay to ensure any pending operations complete
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      await this.fetchUnseenEventsAPI();
    } catch (e) {
      console.error('Unable to check for unseen events', e);
    }
  }

  private async fetchUnseenEventsAPI() {
    try {
      const responseEvents = await this.http.fetchUnseenEvents();

      responseEvents.forEach((e) => {
        this.handleIncomingEvent(e);
      });
    } catch (_error) {
      // Failed to fetch unseen events
      logWalletLinkConnectionFetchUnseenEventsFailed();
    }
  }

  /**
   * Publish an event and emit event ID when successful
   * @param event event name
   * @param unencryptedData unencrypted event data
   * @param callWebhook whether the webhook should be invoked
   * @returns a Promise that emits event ID when successful
   */
  public async publishEvent(
    event: string,
    unencryptedData: WalletLinkEventData,
    callWebhook = false
  ) {
    const data = await this.cipher.encrypt(
      JSON.stringify({
        ...unencryptedData,
        origin: location.origin,
        location: location.href,
        relaySource:
          'coinbaseWalletExtension' in window && window.coinbaseWalletExtension
            ? 'injected_sdk'
            : 'sdk',
      })
    );

    const message: ClientMessage = {
      type: 'PublishEvent',
      id: IntNumber(this.nextReqId++),
      sessionId: this.session.id,
      event,
      data,
      callWebhook,
    };

    return this.setOnceLinked(async () => {
      const res = await this.makeRequest<'PublishEventOK' | 'Fail'>(message);
      if (res.type === 'Fail') {
        throw new Error(res.error || 'failed to publish event');
      }
      return res.eventId;
    });
  }

  private sendData(message: ClientMessage): void {
    this.ws.sendData(JSON.stringify(message));
  }

  private updateLastHeartbeat(): void {
    this.lastHeartbeatResponse = Date.now();
  }

  private heartbeat(): void {
    if (Date.now() - this.lastHeartbeatResponse > HEARTBEAT_INTERVAL * 2) {
      this.ws.disconnect();
      return;
    }

    // Only send heartbeat if we're connected
    if (!this.connected) {
      return;
    }

    try {
      this.ws.sendData('h');
    } catch (_error) {
      // Error sending heartbeat
    }
  }

  private requestResolutions = new Map<IntNumber, (_: ServerMessage) => void>();

  private async makeRequest<T extends ServerMessageType, M = ServerMessage<T>>(
    message: ClientMessage,
    options: { timeout: number } = { timeout: REQUEST_TIMEOUT }
  ): Promise<M> {
    const reqId = message.id;
    this.sendData(message);

    // await server message with corresponding id
    let timeoutId: number;
    return Promise.race([
      new Promise<M>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(`request ${reqId} timed out`));
        }, options.timeout);
      }),
      new Promise<M>((resolve) => {
        this.requestResolutions.set(reqId, (m) => {
          clearTimeout(timeoutId); // clear the timeout
          resolve(m as M);
          this.requestResolutions.delete(reqId);
        });
      }),
    ]);
  }

  private async handleConnected() {
    const res = await this.makeRequest<'OK' | 'Fail'>({
      type: 'HostSession',
      id: IntNumber(this.nextReqId++),
      sessionId: this.session.id,
      sessionKey: this.session.key,
    });
    if (res.type === 'Fail') {
      return false;
    }

    this.sendData({
      type: 'IsLinked',
      id: IntNumber(this.nextReqId++),
      sessionId: this.session.id,
    });

    this.sendData({
      type: 'GetSessionConfig',
      id: IntNumber(this.nextReqId++),
      sessionId: this.session.id,
    });

    return true;
  }

  private handleSessionMetadataUpdated = (metadata: { [_: string]: string }) => {
    if (!metadata) return;

    // Map of metadata key to handler function
    const handlers = new Map<string, (value: string) => void>([
      ['__destroyed', this.handleDestroyed],
      ['EthereumAddress', this.handleAccountUpdated],
      ['WalletUsername', this.handleWalletUsernameUpdated],
      ['AppVersion', this.handleAppVersionUpdated],
      [
        'ChainId', // ChainId and JsonRpcUrl are always updated together
        (v: string) => metadata.JsonRpcUrl && this.handleChainUpdated(v, metadata.JsonRpcUrl),
      ],
    ]);

    // call handler for each metadata key if value is defined
    handlers.forEach((handler, key) => {
      const value = metadata[key];
      if (value === undefined) return;
      handler(value);
    });
  };

  private handleDestroyed = (__destroyed: string) => {
    if (__destroyed !== '1') return;

    this.listener?.resetAndReload();
  };

  private handleAccountUpdated = async (encryptedEthereumAddress: string) => {
    try {
      const address = await this.cipher.decrypt(encryptedEthereumAddress);
      this.listener?.accountUpdated(address);
    } catch {
      // Had error decrypting
    }
  };

  private handleMetadataUpdated = async (key: string, encryptedMetadataValue: string) => {
    try {
      const decryptedValue = await this.cipher.decrypt(encryptedMetadataValue);
      this.listener?.metadataUpdated(key, decryptedValue);
    } catch {
      // Had error decrypting
    }
  };

  private handleWalletUsernameUpdated = async (walletUsername: string) => {
    this.handleMetadataUpdated(WALLET_USER_NAME_KEY, walletUsername);
  };

  private handleAppVersionUpdated = async (appVersion: string) => {
    this.handleMetadataUpdated(APP_VERSION_KEY, appVersion);
  };

  private handleChainUpdated = async (encryptedChainId: string, encryptedJsonRpcUrl: string) => {
    try {
      const chainId = await this.cipher.decrypt(encryptedChainId);
      const jsonRpcUrl = await this.cipher.decrypt(encryptedJsonRpcUrl);
      this.listener?.chainUpdated(chainId, jsonRpcUrl);
    } catch {
      // Had error decrypting
    }
  };
}
