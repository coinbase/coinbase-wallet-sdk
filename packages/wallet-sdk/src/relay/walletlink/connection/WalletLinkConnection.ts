// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { IntNumber } from '../../../core/type';
import { Cipher } from '../../../lib/Cipher';
import { DiagnosticLogger, EVENTS } from '../../../provider/DiagnosticLogger';
import { APP_VERSION_KEY, WALLET_USER_NAME_KEY } from '../../RelayAbstract';
import { Session } from '../../Session';
import { ClientMessage } from '../type/ClientMessage';
import { ServerMessage, ServerMessageType } from '../type/ServerMessage';
import { SessionConfig } from '../type/SessionConfig';
import { WalletLinkEventData, WalletLinkResponseEventData } from '../type/WalletLinkEventData';
import { WalletLinkHTTP } from './WalletLinkHTTP';
import { ConnectionState, WalletLinkWebSocket } from './WalletLinkWebSocket';

const HEARTBEAT_INTERVAL = 10000;
const REQUEST_TIMEOUT = 60000;

export interface WalletLinkConnectionUpdateListener {
  linkedUpdated: (linked: boolean) => void;
  connectedUpdated: (connected: boolean) => void;
  handleWeb3ResponseMessage: (message: WalletLinkResponseEventData) => void;
  chainUpdated: (chainId: string, jsonRpcUrl: string) => void;
  accountUpdated: (selectedAddress: string) => void;
  metadataUpdated: (key: string, metadataValue: string) => void;
  resetAndReload: () => void;
}

interface WalletLinkConnectionParams {
  session: Session;
  linkAPIUrl: string;
  listener: WalletLinkConnectionUpdateListener;
  diagnostic?: DiagnosticLogger;
  WebSocketClass?: typeof WebSocket;
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

  private readonly session: Session;

  private listener?: WalletLinkConnectionUpdateListener;
  private diagnostic?: DiagnosticLogger;
  private cipher: Cipher;
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
  constructor({
    session,
    linkAPIUrl,
    listener,
    diagnostic,
    WebSocketClass = WebSocket,
  }: WalletLinkConnectionParams) {
    this.session = session;
    this.cipher = new Cipher(session.secret);
    this.diagnostic = diagnostic;
    this.listener = listener;
    this.linkAPIUrl = linkAPIUrl;
    this.WebSocketClass = WebSocketClass;

    console.debug('[WalletLinkConnection] Creating new WalletLinkWebSocket instance');
    const ws = this.createWebSocket();
    this.ws = ws;

    this.http = new WalletLinkHTTP(linkAPIUrl, session.id, session.key);

    // Set up visibility and focus handlers for mobile Safari
    this.setupMobileSafariHandlers();
  }

  private createWebSocket(): WalletLinkWebSocket {
    const ws = new WalletLinkWebSocket(`${this.linkAPIUrl}/rpc`, this.WebSocketClass);
    console.debug('[WalletLinkConnection] WebSocket instance created. Total active WebSocket instances:', (WalletLinkWebSocket as any).getActiveInstances());
    
    // Track this as the active WebSocket instance
    this.activeWsInstance = ws;
    
    ws.setConnectionStateListener(async (state) => {
      // Ignore events from non-active WebSocket instances
      if (ws !== this.activeWsInstance) {
        console.debug('[WalletLinkConnection] Ignoring state change from non-active WebSocket instance');
        return;
      }
      
      // attempt to reconnect every 5 seconds when disconnected
      console.debug('[WalletLinkConnection] Connection state changed to:', ConnectionState[state], 'shouldFetchUnseenEventsOnConnect:', this.shouldFetchUnseenEventsOnConnect);
      this.diagnostic?.log(EVENTS.CONNECTED_STATE_CHANGE, {
        state,
        sessionIdHash: Session.hash(this.session.id),
      });

      let connected = false;
      switch (state) {
        case ConnectionState.DISCONNECTED:
          // Clear heartbeat timer when disconnected
          if (this.heartbeatIntervalId) {
            clearInterval(this.heartbeatIntervalId);
            this.heartbeatIntervalId = undefined;
            console.debug('[WalletLinkConnection] Cleared heartbeat timer');
          }
          
          // Reset lastHeartbeatResponse to prevent false timeout on reconnection
          this.lastHeartbeatResponse = 0;
          console.debug('[WalletLinkConnection] Reset lastHeartbeatResponse on disconnect');
          
          // Reset connected state to false on disconnect
          connected = false;
          console.debug('[WalletLinkConnection] DISCONNECTED case - shouldFetchUnseenEventsOnConnect:', this.shouldFetchUnseenEventsOnConnect);
          
          // if DISCONNECTED and not destroyed, create a fresh WebSocket connection
          if (!this.destroyed) {
            const reconnect = async () => {
              // Prevent multiple concurrent reconnection attempts
              if (this.isReconnecting) {
                console.debug('[WalletLinkConnection] Reconnection already in progress, skipping');
                return;
              }
              
              this.isReconnecting = true;
              
              // Calculate delay with exponential backoff (max 30 seconds)
              const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
              console.debug(`[WalletLinkConnection] Waiting ${delay}ms before reconnection attempt ${this.reconnectAttempts + 1}`);
              
              // wait with exponential backoff
              await new Promise((resolve) => setTimeout(resolve, delay));
              
              // check whether it's destroyed again and ensure this is still the active instance
              if (!this.destroyed && ws === this.activeWsInstance) {
                this.reconnectAttempts++;
                console.debug('[WalletLinkConnection] Creating fresh WebSocket for reconnection');
                
                // Clean up the old WebSocket instance
                if ('cleanup' in this.ws && typeof this.ws.cleanup === 'function') {
                  (this.ws as any).cleanup();
                }
                
                // Create a fresh WebSocket instance
                this.ws = this.createWebSocket();
                this.ws.connect().catch(() => {
                  console.error('[WalletLinkConnection] Reconnection failed, will retry');
                }).finally(() => {
                  this.isReconnecting = false;
                });
              } else {
                console.debug('[WalletLinkConnection] Skipping reconnection - destroyed or not active instance');
                this.isReconnecting = false;
              }
            };
            reconnect();
          }
          break;

        case ConnectionState.CONNECTED:
          // Reset reconnect attempts on successful connection
          this.reconnectAttempts = 0;
          
          console.debug('[WalletLinkConnection] CONNECTED case - current connected state:', this.connected, 'shouldFetchUnseenEventsOnConnect:', this.shouldFetchUnseenEventsOnConnect);
          
          // perform authentication upon connection
          console.debug('[WalletLinkConnection] Connected, starting authentication');
          try {
            // if CONNECTED, authenticate, and then check link status
            await this.authenticate();
            console.debug('[WalletLinkConnection] Authentication successful');
            this.sendIsLinked();
            this.sendGetSessionConfig();
            connected = true;
            
            // Always fetch unseen events when WebSocket state changes to CONNECTED
            // This happens regardless of the shouldFetchUnseenEventsOnConnect flag
            console.debug('[WalletLinkConnection] Fetching unseen events after successful connection');
            this.fetchUnseenEventsAPI().catch((error) => {
              console.error('[WalletLinkConnection] Failed to fetch unseen events:', error);
              this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
                message: 'Failed to fetch unseen events after connection',
                value: error instanceof Error ? error.message : 'Unknown error',
                sessionIdHash: Session.hash(this.session.id),
              });
            });
          } catch (error) {
            console.error('[WalletLinkConnection] Authentication failed:', error);
            // Don't set connected to true if authentication fails
            break;
          }

          // Update connected state immediately after successful authentication
          // This ensures heartbeats won't be skipped
          console.debug('[WalletLinkConnection] Setting connected state to true before starting heartbeat');
          this.connected = connected;

          // send heartbeat every n seconds while connected
          // if CONNECTED, start the heartbeat timer
          // first timer event updates lastHeartbeat timestamp
          // subsequent calls send heartbeat message
          this.updateLastHeartbeat();
          
          // Clear any existing heartbeat timer before creating a new one
          if (this.heartbeatIntervalId) {
            clearInterval(this.heartbeatIntervalId);
          }
          
          this.heartbeatIntervalId = window.setInterval(() => {
            this.heartbeat();
          }, HEARTBEAT_INTERVAL);
          console.debug('[WalletLinkConnection] Started heartbeat timer');

          // Send an immediate heartbeat to verify connection is alive
          // This is especially important for reconnections
          setTimeout(() => {
            console.debug('[WalletLinkConnection] Sending initial heartbeat after connection');
            this.heartbeat();
          }, 100);

          break;

        case ConnectionState.CONNECTING:
          console.debug('[WalletLinkConnection] Connection in progress');
          break;
      }

      // Update connected state for DISCONNECTED and CONNECTING cases
      // For CONNECTED case, it's already set above
      if (state !== ConnectionState.CONNECTED) {
        console.debug('[WalletLinkConnection] Updating connected state from', this.connected, 'to', connected);
        this.connected = connected;
      }
    });
    
    ws.setIncomingDataListener((m) => {
      console.debug('[WalletLinkConnection] Received message type:', m.type, 'Full message:', m);
      switch (m.type) {
        // handle server's heartbeat responses
        case 'Heartbeat':
          this.updateLastHeartbeat();
          return;

        // handle link status updates
        case 'IsLinkedOK':
        case 'Linked': {
          const linked = m.type === 'IsLinkedOK' ? m.linked : undefined;
          console.debug('[WalletLinkConnection] Link status update:', { linked, onlineGuests: m.onlineGuests });
          this.diagnostic?.log(EVENTS.LINKED, {
            sessionIdHash: Session.hash(this.session.id),
            linked,
            type: m.type,
            onlineGuests: m.onlineGuests,
          });

          this.linked = linked || m.onlineGuests > 0;
          break;
        }

        // handle session config updates
        case 'GetSessionConfigOK':
        case 'SessionConfigUpdated': {
          console.debug('[WalletLinkConnection] Session config received:', m.metadata);
          this.diagnostic?.log(EVENTS.SESSION_CONFIG_RECEIVED, {
            sessionIdHash: Session.hash(this.session.id),
            metadata_keys: m && m.metadata ? Object.keys(m.metadata) : undefined,
          });
          this.handleSessionMetadataUpdated(m.metadata);
          break;
        }

        case 'Event': {
          console.debug('[WalletLinkConnection] Received event:', m.event, 'EventId:', m.eventId);
          this.handleIncomingEvent(m);
          break;
        }
        
        case 'Fail': {
          console.error('[WalletLinkConnection] Received Fail message:', m.error, 'for request id:', m.id);
          this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
            message: 'Server returned Fail response',
            value: m.error,
            sessionIdHash: Session.hash(this.session.id),
          });
          // Don't disconnect on Fail, let the request timeout or handle it gracefully
          break;
        }
      }

      // resolve request promises
      if (m.id !== undefined) {
        console.debug('[WalletLinkConnection] Resolving request with id:', m.id);
        this.requestResolutions.get(m.id)?.(m);
      }
    });
    
    return ws;
  }

  private setupMobileSafariHandlers(): void {
    // Handle visibility changes (when app is backgrounded/foregrounded)
    this.visibilityChangeHandler = () => {
      console.debug('[WalletLinkConnection] Visibility changed, document.hidden:', document.hidden);
      
      if (!document.hidden && !this.destroyed) {
        // Page became visible - check connection and reconnect if needed
        console.debug('[WalletLinkConnection] Page became visible, checking connection status');
        
        // Force a fresh connection if we're disconnected
        if (!this.connected) {
          console.debug('[WalletLinkConnection] Not connected, forcing fresh connection');
          this.reconnectWithFreshWebSocket();
        } else {
          // Send a heartbeat to check if connection is still alive
          this.heartbeat();
        }
      }
    };

    // Handle focus events (when user switches back to the tab/app)
    this.focusHandler = () => {
      console.debug('[WalletLinkConnection] Window focused');
      
      if (!this.destroyed && !this.connected) {
        console.debug('[WalletLinkConnection] Window focused but not connected, forcing fresh connection');
        this.reconnectWithFreshWebSocket();
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    window.addEventListener('focus', this.focusHandler);
    
    // Also handle pageshow event for iOS Safari
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        console.debug('[WalletLinkConnection] Page restored from bfcache');
        if (this.focusHandler) {
          this.focusHandler();
        }
      }
    });
  }

  private reconnectWithFreshWebSocket(): void {
    if (this.destroyed) return;
    
    console.debug('[WalletLinkConnection] Reconnecting with fresh WebSocket');
    
    // Clear the active instance reference before disconnecting
    const oldWs = this.ws;
    this.activeWsInstance = undefined;
    
    // Disconnect current WebSocket
    oldWs.disconnect();
    
    // Clean up the old instance
    if ('cleanup' in oldWs && typeof oldWs.cleanup === 'function') {
      (oldWs as any).cleanup();
    }
    
    // Create and connect fresh WebSocket
    this.ws = this.createWebSocket();
    this.ws.connect().catch((error) => {
      console.error('[WalletLinkConnection] Fresh reconnection failed:', error);
    });
  }

  /**
   * Make a connection to the server
   */
  public connect(): void {
    if (this.destroyed) {
      throw new Error('instance is destroyed');
    }
    this.diagnostic?.log(EVENTS.STARTED_CONNECTING, {
      sessionIdHash: Session.hash(this.session.id),
    });
    this.ws.connect();
  }

  /**
   * Terminate connection, and mark as destroyed. To reconnect, create a new
   * instance of WalletSDKConnection
   */
  public destroy(): void {
    this.destroyed = true;
    
    // Clear the active instance reference
    this.activeWsInstance = undefined;

    // Clear heartbeat timer
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = undefined;
      console.debug('[WalletLinkConnection] Cleared heartbeat timer on destroy');
    }

    // Remove event listeners
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
    }

    console.debug('[WalletLinkConnection] Destroying connection - calling disconnect');
    this.ws.disconnect();
    
    // Call cleanup on the WebSocket instance if it has the method
    if ('cleanup' in this.ws && typeof this.ws.cleanup === 'function') {
      (this.ws as any).cleanup();
    }
    
    this.diagnostic?.log(EVENTS.DISCONNECTED, {
      sessionIdHash: Session.hash(this.session.id),
    });

    this.listener = undefined;
  }

  public get isDestroyed(): boolean {
    return this.destroyed;
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
    const previouslyConnected = this._connected;
    this._connected = connected;
    
    // Detect transition from disconnected to connected
    const isNewConnection = !previouslyConnected && connected;
    
    if (connected) this.onceConnected?.();
    this.listener?.connectedUpdated(connected);
    
    // Fetch unseen events on new connection if flag is set
    if (isNewConnection && this.shouldFetchUnseenEventsOnConnect) {
      console.debug('[WalletLinkConnection] New connection established, fetching unseen events');
      // Reset the flag if it was set
      this.shouldFetchUnseenEventsOnConnect = false;
      // Delay slightly to ensure connection is fully established
      setTimeout(() => {
        this.fetchUnseenEventsAPI().catch((error) => {
          console.error('[WalletLinkConnection] Failed to fetch unseen events on new connection:', error);
          this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
            message: 'Failed to fetch unseen events on new connection',
            value: error instanceof Error ? error.message : 'Unknown error',
            sessionIdHash: Session.hash(this.session.id),
          });
        });
      }, 100);
    }
  }

  /**
   * Execute once when connected
   */
  private onceConnected?: () => void;
  private setOnceConnected<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve) => {
      if (this.connected) {
        callback().then(resolve);
      } else {
        this.onceConnected = () => {
          callback().then(resolve);
          this.onceConnected = undefined;
        };
      }
    });
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
      console.debug('[WalletLinkConnection] Ignoring non-Web3Response event:', m.type === 'Event' ? m.event : 'non-Event message');
      return;
    }

    console.debug('[WalletLinkConnection] Processing Web3Response event, eventId:', m.eventId);
    try {
      const decryptedData = await this.cipher.decrypt(m.data);
      const message = JSON.parse(decryptedData);
      console.debug('[WalletLinkConnection] Decrypted Web3Response:', {
        type: message.type,
        id: message.id,
        response: message.response ? {
          method: message.response.method,
          errorMessage: message.response.errorMessage,
          errorCode: message.response.errorCode,
          result: message.response.result ? '(result present)' : '(no result)',
        } : '(no response)',
      });

      if (message.type !== 'WEB3_RESPONSE') return;

      this.listener?.handleWeb3ResponseMessage(message);
    } catch (error) {
      console.error('[WalletLinkConnection] Error decrypting event:', error);
      this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
        message: 'Had error decrypting',
        value: 'incomingEvent',
      });
    }
  }

  private shouldFetchUnseenEventsOnConnect = false;

  public async checkUnseenEvents() {
    console.debug('[WalletLinkConnection] checkUnseenEvents called, connected:', this.connected);

    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      console.debug('[WalletLinkConnection] Fetching unseen events via API');
      await this.fetchUnseenEventsAPI();
    } catch (e) {
      console.error('Unable to check for unseen events', e);
    }
  }

  private async fetchUnseenEventsAPI() {
    console.debug('[WalletLinkConnection] fetchUnseenEventsAPI called');
    
    try {
      const responseEvents = await this.http.fetchUnseenEvents();
      console.debug('[WalletLinkConnection] Found', responseEvents.length, 'unseen events');
      
      if (responseEvents.length > 0) {
        console.debug('[WalletLinkConnection] Unseen events details:');
        this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
          message: 'Fetched unseen events',
          value: `Found ${responseEvents.length} unseen events`,
          sessionIdHash: Session.hash(this.session.id),
        });
      }
      
      responseEvents.forEach((e, index) => {
        console.debug(`[WalletLinkConnection] Processing unseen event ${index + 1}/${responseEvents.length}:`, {
          type: e.type,
          event: e.event,
          eventId: e.eventId,
          sessionId: e.sessionId,
        });
        this.handleIncomingEvent(e);
      });
    } catch (error) {
      console.error('[WalletLinkConnection] Failed to fetch unseen events:', error);
      this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
        message: 'Failed to fetch unseen events',
        value: error instanceof Error ? error.message : 'Unknown error',
        sessionIdHash: Session.hash(this.session.id),
      });
    }
  }

  /**
   * Set session metadata in SessionConfig object
   * @param key
   * @param value
   * @returns a Promise that completes when successful
   */
  public async setSessionMetadata(key: string, value: string | null) {
    const message: ClientMessage = {
      type: 'SetSessionConfig',
      id: IntNumber(this.nextReqId++),
      sessionId: this.session.id,
      metadata: { [key]: value },
    };

    return this.setOnceConnected(async () => {
      const res = await this.makeRequest<'OK' | 'Fail'>(message);
      if (res.type === 'Fail') {
        throw new Error(res.error || 'failed to set session metadata');
      }
    });
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
        relaySource: window.coinbaseWalletExtension ? 'injected_sdk' : 'sdk',
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
    console.debug('[WalletLinkConnection] Sending message:', message);
    this.ws.sendData(JSON.stringify(message));
  }

  private updateLastHeartbeat(): void {
    this.lastHeartbeatResponse = Date.now();
    console.debug('[WalletLinkConnection] Updated last heartbeat timestamp:', this.lastHeartbeatResponse);
  }

  private heartbeat(): void {
    if (Date.now() - this.lastHeartbeatResponse > HEARTBEAT_INTERVAL * 2) {
      console.debug('[WalletLinkConnection] Heartbeat timeout detected - no response for', Date.now() - this.lastHeartbeatResponse, 'ms (threshold:', HEARTBEAT_INTERVAL * 2, 'ms)');
      console.debug('[WalletLinkConnection] Disconnecting due to heartbeat timeout');
      this.ws.disconnect();
      return;
    }
    
    // Only send heartbeat if we're connected
    if (!this.connected) {
      console.debug('[WalletLinkConnection] Skipping heartbeat - not connected');
      return;
    }
    
    try {
      console.debug('[WalletLinkConnection] Sending heartbeat');
      this.ws.sendData('h');
    } catch (error) {
      console.error('[WalletLinkConnection] Error sending heartbeat:', error);
    }
  }

  private requestResolutions = new Map<IntNumber, (_: ServerMessage) => void>();

  private async makeRequest<T extends ServerMessageType, M = ServerMessage<T>>(
    message: ClientMessage,
    timeout: number = REQUEST_TIMEOUT
  ): Promise<M> {
    const reqId = message.id;
    this.sendData(message);

    // await server message with corresponding id
    let timeoutId: number;
    return Promise.race([
      new Promise<M>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(`request ${reqId} timed out`));
        }, timeout);
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

  private async authenticate() {
    const m: ClientMessage = {
      type: 'HostSession',
      id: IntNumber(this.nextReqId++),
      sessionId: this.session.id,
      sessionKey: this.session.key,
    };
    const res = await this.makeRequest<'OK' | 'Fail'>(m);
    if (res.type === 'Fail') {
      throw new Error(res.error || 'failed to authentcate');
    }
  }

  private sendIsLinked(): void {
    const m: ClientMessage = {
      type: 'IsLinked',
      id: IntNumber(this.nextReqId++),
      sessionId: this.session.id,
    };
    this.sendData(m);
  }

  private sendGetSessionConfig(): void {
    const m: ClientMessage = {
      type: 'GetSessionConfig',
      id: IntNumber(this.nextReqId++),
      sessionId: this.session.id,
    };
    this.sendData(m);
  }

  private handleSessionMetadataUpdated = (metadata: SessionConfig['metadata']) => {
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
    this.diagnostic?.log(EVENTS.METADATA_DESTROYED, {
      alreadyDestroyed: this.isDestroyed,
      sessionIdHash: Session.hash(this.session.id),
    });
  };

  private handleAccountUpdated = async (encryptedEthereumAddress: string) => {
    try {
      const address = await this.cipher.decrypt(encryptedEthereumAddress);
      this.listener?.accountUpdated(address);
    } catch {
      this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
        message: 'Had error decrypting',
        value: 'selectedAddress',
      });
    }
  };

  private handleMetadataUpdated = async (key: string, encryptedMetadataValue: string) => {
    try {
      const decryptedValue = await this.cipher.decrypt(encryptedMetadataValue);
      this.listener?.metadataUpdated(key, decryptedValue);
    } catch {
      this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
        message: 'Had error decrypting',
        value: key,
      });
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
      this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
        message: 'Had error decrypting',
        value: 'chainId|jsonRpcUrl',
      });
    }
  };
}