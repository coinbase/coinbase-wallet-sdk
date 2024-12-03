// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { APP_VERSION_KEY, WALLET_USER_NAME_KEY } from '../constants.js';
import { ClientMessage } from '../type/ClientMessage.js';
import { ServerMessage, ServerMessageType } from '../type/ServerMessage.js';
import { WalletLinkEventData } from '../type/WalletLinkEventData.js';
import { WalletLinkSession } from '../type/WalletLinkSession.js';
import { Web3Response } from '../type/Web3Response.js';
import { WalletLinkCipher } from './WalletLinkCipher.js';
import { WalletLinkHTTP } from './WalletLinkHTTP.js';
import { ConnectionState, WalletLinkWebSocket } from './WalletLinkWebSocket.js';
import { IntNumber } from ':core/type/index.js';

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

  private readonly session: WalletLinkSession;

  private listener?: WalletLinkConnectionUpdateListener;
  private cipher: WalletLinkCipher;
  private ws: WalletLinkWebSocket;
  private http: WalletLinkHTTP;

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

    const ws = new WalletLinkWebSocket(`${linkAPIUrl}/rpc`, WebSocket);
    ws.setConnectionStateListener(async (state) => {
      // attempt to reconnect every 5 seconds when disconnected
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
          // if CONNECTED, authenticate, and then check link status
          connected = await this.handleConnected();

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
    this.ws = ws;

    this.http = new WalletLinkHTTP(linkAPIUrl, session.id, session.key);
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
    this.ws.disconnect();
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

    const decryptedData = await this.cipher.decrypt(m.data);
    const message: WalletLinkEventData = JSON.parse(decryptedData);

    if (message.type !== 'WEB3_RESPONSE') return;

    const { id, response } = message;
    this.listener?.handleWeb3ResponseMessage(id, response);
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
    try {
      this.ws.sendData('h');
    } catch {
      // noop
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
    if (res.type === 'Fail') return false;

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
    const address = await this.cipher.decrypt(encryptedEthereumAddress);
    this.listener?.accountUpdated(address);
  };

  private handleMetadataUpdated = async (key: string, encryptedMetadataValue: string) => {
    const decryptedValue = await this.cipher.decrypt(encryptedMetadataValue);
    this.listener?.metadataUpdated(key, decryptedValue);
  };

  private handleWalletUsernameUpdated = async (walletUsername: string) => {
    this.handleMetadataUpdated(WALLET_USER_NAME_KEY, walletUsername);
  };

  private handleAppVersionUpdated = async (appVersion: string) => {
    this.handleMetadataUpdated(APP_VERSION_KEY, appVersion);
  };

  private handleChainUpdated = async (encryptedChainId: string, encryptedJsonRpcUrl: string) => {
    const chainId = await this.cipher.decrypt(encryptedChainId);
    const jsonRpcUrl = await this.cipher.decrypt(encryptedJsonRpcUrl);
    this.listener?.chainUpdated(chainId, jsonRpcUrl);
  };
}
