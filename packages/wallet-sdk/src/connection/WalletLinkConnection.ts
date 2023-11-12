// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import * as aes256gcm from '../relay/aes256gcm';
import { Session } from '../relay/Session';
import { IntNumber } from '../types';
import {
  ClientMessage,
  ClientMessageGetSessionConfig,
  ClientMessageHostSession,
  ClientMessageIsLinked,
  ClientMessagePublishEvent,
  ClientMessageSetSessionConfig,
} from './ClientMessage';
import { DiagnosticLogger, EVENTS } from './DiagnosticLogger';
import {
  isServerMessageFail,
  ServerMessage,
  ServerMessageEvent,
  ServerMessageFail,
  ServerMessageGetSessionConfigOK,
  ServerMessageIsLinkedOK,
  ServerMessageLinked,
  ServerMessageOK,
  ServerMessagePublishEventOK,
  ServerMessageSessionConfigUpdated,
} from './ServerMessage';
import { SessionConfig } from './SessionConfig';
import { WalletLinkHTTP } from './WalletLinkHTTP';
import { ConnectionState, WalletLinkWebSocket } from './WalletLinkWebSocket';

const HEARTBEAT_INTERVAL = 10000;
const REQUEST_TIMEOUT = 60000;

export interface WalletLinkConnectionUpdateListener {
  linkedUpdated: (linked: boolean) => void;
  connectedUpdated: (connected: boolean) => void;
  incomingEvent: (event: ServerMessageEvent) => void;
  chainUpdated: (chainId: string, jsonRpcUrl: string) => void;
  accountUpdated: (selectedAddress: string) => void;
  metadataUpdated: (key: string, metadataValue: string) => void;
  resetAndReload: () => void;
}

/**
 * Coinbase Wallet Connection
 */
export class WalletLinkConnection {
  private ws: WalletLinkWebSocket;
  private http: WalletLinkHTTP;
  private listener?: WalletLinkConnectionUpdateListener;
  private destroyed = false;
  private lastHeartbeatResponse = 0;
  private nextReqId = IntNumber(1);

  private readonly sessionId: string;
  private readonly sessionKey: string;
  private readonly decrypt: (_: string) => Promise<string>;
  private chainId = '';
  private jsonRpcUrl = '';

  constructor(
    session: Session,
    linkAPIUrl: string,
    listener: WalletLinkConnectionUpdateListener,
    private diagnostic?: DiagnosticLogger,
    WebSocketClass: typeof WebSocket = WebSocket
  ) {
    const sessionId = (this.sessionId = session.id);
    const sessionKey = (this.sessionKey = session.key);

    this.listener = listener;
    this.decrypt = (cipherText: string) => aes256gcm.decrypt(cipherText, session.secret);

    const ws = new WalletLinkWebSocket(`${linkAPIUrl}/rpc`, WebSocketClass);
    ws.setConnectionStateListener(async (state) => {
      // attempt to reconnect every 5 seconds when disconnected
      this.diagnostic?.log(EVENTS.CONNECTED_STATE_CHANGE, {
        state,
        sessionIdHash: Session.hash(sessionId),
      });

      let connected = false;
      switch (state) {
        case ConnectionState.DISCONNECTED:
          // if DISCONNECTED and not destroyed
          if (!this.destroyed) {
            const connect = async () => {
              // wait 5 seconds
              await new Promise((resolve) => setTimeout(resolve, 5000));
              // check whether it's destroyed again
              if (!this.destroyed) {
                // reconnect
                ws.connect().catch(() => {
                  connect();
                });
              }
            };
            connect();
          }
          break;

        case ConnectionState.CONNECTED:
          // perform authentication upon connection
          try {
            // if CONNECTED, authenticate, and then check link status
            await this.authenticate();
            this.sendIsLinked();
            this.sendGetSessionConfig();
            connected = true;
          } catch {
            /* empty */
          }

          // send heartbeat every n seconds while connected
          // if CONNECTED, start the heartbeat timer
          // first timer event updates lastHeartbeat timestamp
          // subsequent calls send heartbeat message
          this.updateLastHeartbeat();
          setInterval(() => {
            this.heartbeat();
          }, HEARTBEAT_INTERVAL);

          // check for unseen events
          if (this.shouldFetchUnseenEventsOnConnect) {
            this.fetchUnseenEventsAPI();
          }
          break;

        case ConnectionState.CONNECTING:
          break;
      }

      // distinctUntilChanged
      if (this.connected !== connected) {
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
          const msg = m as Omit<ServerMessageIsLinkedOK, 'type'> & ServerMessageLinked;
          this.diagnostic?.log(EVENTS.LINKED, {
            sessionIdHash: Session.hash(sessionId),
            linked: msg.linked,
            type: m.type,
            onlineGuests: msg.onlineGuests,
          });

          this.linked = msg.linked || msg.onlineGuests > 0;
          break;
        }

        // handle session config updates
        case 'GetSessionConfigOK':
        case 'SessionConfigUpdated': {
          const msg = m as Omit<ServerMessageGetSessionConfigOK, 'type'> &
            ServerMessageSessionConfigUpdated;
          this.diagnostic?.log(EVENTS.SESSION_CONFIG_RECEIVED, {
            sessionIdHash: Session.hash(sessionId),
            metadata_keys: msg && msg.metadata ? Object.keys(msg.metadata) : undefined,
          });
          if (msg.metadata) {
            this.handleSessionConfigUpdated(msg.metadata);
          }
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
    this.ws = ws;

    this.http = new WalletLinkHTTP(linkAPIUrl, sessionId, sessionKey);
  }

  /**
   * Make a connection to the server
   */
  public connect(): void {
    if (this.destroyed) {
      throw new Error('instance is destroyed');
    }
    this.diagnostic?.log(EVENTS.STARTED_CONNECTING, {
      sessionIdHash: Session.hash(this.sessionId),
    });
    this.ws.connect();
  }

  /**
   * Terminate connection, and mark as destroyed. To reconnect, create a new
   * instance of WalletSDKConnection
   */
  public destroy(): void {
    this.destroyed = true;

    this.ws.disconnect();
    this.diagnostic?.log(EVENTS.DISCONNECTED, {
      sessionIdHash: Session.hash(this.sessionId),
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
    this._connected = connected;
    if (connected) this.onceConnected?.();
    this.listener?.connectedUpdated(connected);
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

  private handleIncomingEvent(m: ServerMessage) {
    function isServerMessageEvent(msg: ServerMessage): msg is ServerMessageEvent {
      if (msg.type !== 'Event') {
        return false;
      }
      const sme = msg as ServerMessageEvent;
      return (
        typeof sme.sessionId === 'string' &&
        typeof sme.eventId === 'string' &&
        typeof sme.event === 'string' &&
        typeof sme.data === 'string'
      );
    }

    if (!isServerMessageEvent(m)) {
      return;
    }

    this.listener?.incomingEvent(m);
  }

  private shouldFetchUnseenEventsOnConnect = false;

  public async checkUnseenEvents() {
    if (!this.connected) {
      this.shouldFetchUnseenEventsOnConnect = true;
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      await this.fetchUnseenEventsAPI();
    } catch (e) {
      console.error('Unable to check for unseen events', e);
    }
  }

  private async fetchUnseenEventsAPI() {
    this.shouldFetchUnseenEventsOnConnect = false;

    const responseEvents = await this.http.fetchUnseenEvents();
    responseEvents.forEach((e) => this.handleIncomingEvent(e));
  }

  /**
   * Set session metadata in SessionConfig object
   * @param key
   * @param value
   * @returns a Promise that completes when successful
   */
  public async setSessionMetadata(key: string, value: string | null) {
    const message = ClientMessageSetSessionConfig({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
      metadata: { [key]: value },
    });

    return this.setOnceConnected(async () => {
      const res = await this.makeRequest<ServerMessageOK | ServerMessageFail>(message);
      if (isServerMessageFail(res)) {
        throw new Error(res.error || 'failed to set session metadata');
      }
    });
  }

  /**
   * Publish an event and emit event ID when successful
   * @param event event name
   * @param data event data
   * @param callWebhook whether the webhook should be invoked
   * @returns a Promise that emits event ID when successful
   */
  public async publishEvent(event: string, data: string, callWebhook = false) {
    const message = ClientMessagePublishEvent({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
      event,
      data,
      callWebhook,
    });

    return this.setOnceLinked(async () => {
      const res = await this.makeRequest<ServerMessagePublishEventOK | ServerMessageFail>(message);
      if (isServerMessageFail(res)) {
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
    try {
      this.ws.sendData('h');
    } catch {
      // noop
    }
  }

  private requestResolutions = new Map<IntNumber, (_: ServerMessage) => void>();

  private async makeRequest<T extends ServerMessage>(
    message: ClientMessage,
    timeout: number = REQUEST_TIMEOUT
  ): Promise<T> {
    const reqId = message.id;
    this.sendData(message);

    // await server message with corresponding id
    let timeoutId: number;
    return Promise.race([
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(`request ${reqId} timed out`));
        }, timeout);
      }),
      new Promise<T>((resolve) => {
        this.requestResolutions.set(reqId, (m) => {
          clearTimeout(timeoutId); // clear the timeout
          resolve(m as T);
          this.requestResolutions.delete(reqId);
        });
      }),
    ]);
  }

  private async authenticate() {
    const msg = ClientMessageHostSession({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
      sessionKey: this.sessionKey,
    });
    const res = await this.makeRequest<ServerMessageOK | ServerMessageFail>(msg);
    if (isServerMessageFail(res)) {
      throw new Error(res.error || 'failed to authentcate');
    }
  }

  private sendIsLinked(): void {
    const msg = ClientMessageIsLinked({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
    });
    this.sendData(msg);
  }

  private sendGetSessionConfig(): void {
    const msg = ClientMessageGetSessionConfig({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
    });
    this.sendData(msg);
  }

  handleSessionConfigUpdated(metadata: SessionConfig['metadata']) {
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
  }

  private async handleDestroyed(__destroyed: string) {
    if (__destroyed !== '1') return;

    this.listener?.resetAndReload();
    this.diagnostic?.log(EVENTS.METADATA_DESTROYED, {
      alreadyDestroyed: this.isDestroyed,
      sessionIdHash: Session.hash(this.sessionId),
    });
  }

  private async handleAccountUpdated(encryptedEthereumAddress: string) {
    const address = await this.decrypt(encryptedEthereumAddress);
    this.listener?.accountUpdated(address);
  }

  private async handleMetadataUpdated(key: string, encryptedMetadataValue: string) {
    const decryptedValue = await this.decrypt(encryptedMetadataValue);
    this.listener?.metadataUpdated(key, decryptedValue);
  }

  private async handleWalletUsernameUpdated(walletUsername: string) {
    const WALLET_USER_NAME_KEY = 'walletUsername';
    this.handleMetadataUpdated(WALLET_USER_NAME_KEY, walletUsername);
  }

  private async handleAppVersionUpdated(appVersion: string) {
    const APP_VERSION_KEY = 'AppVersion';
    this.handleMetadataUpdated(APP_VERSION_KEY, appVersion);
  }

  private async handleChainUpdated(encryptedChainId: string, encryptedJsonRpcUrl: string) {
    const chainId = await this.decrypt(encryptedChainId);
    const jsonRpcUrl = await this.decrypt(encryptedJsonRpcUrl);

    if (this.chainId === chainId && this.jsonRpcUrl === jsonRpcUrl) return;

    this.chainId = chainId;
    this.jsonRpcUrl = jsonRpcUrl;
    this.listener?.chainUpdated(chainId, jsonRpcUrl);
  }
}
