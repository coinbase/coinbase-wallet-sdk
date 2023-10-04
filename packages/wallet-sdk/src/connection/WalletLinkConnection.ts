// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

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
import { ConnectionState, WalletLinkWebSocket } from './RxWebSocket';
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

const HEARTBEAT_INTERVAL = 10000;
const REQUEST_TIMEOUT = 60000;

/**
 * Coinbase Wallet Connection
 */
export class WalletLinkConnection {
  private ws: WalletLinkWebSocket;
  private destroyed = false;
  private lastHeartbeatResponse = 0;
  private nextReqId = IntNumber(1);
  private connected = false;
  private linked = false;

  private sessionConfigListener?: (_: SessionConfig) => void;
  setSessionConfigListener(listener: (_: SessionConfig) => void): void {
    this.sessionConfigListener = listener;
  }

  private linkedListener?: (_: boolean) => void;
  setLinkedListener(listener: (_: boolean) => void): void {
    this.linkedListener = listener;
  }

  private connectedListener?: (_: boolean) => void;
  setConnectedListener(listener: (_: boolean) => void): void {
    this.connectedListener = listener;
  }

  private incomingEventListener?: (_: ServerMessageEvent) => void;
  setIncomingEventListener(listener: (_: ServerMessageEvent) => void): void {
    this.incomingEventListener = listener;
  }

  /**
   * Constructor
   * @param sessionId Session ID
   * @param sessionKey Session Key
   * @param linkAPIUrl Coinbase Wallet link server URL
   * @param [WebSocketClass] Custom WebSocket implementation
   */
  constructor(
    private sessionId: string,
    private sessionKey: string,
    private linkAPIUrl: string,
    private diagnostic?: DiagnosticLogger,
    WebSocketClass: typeof WebSocket = WebSocket
  ) {
    const ws = new WalletLinkWebSocket(`${linkAPIUrl}/rpc`, WebSocketClass);
    this.ws = ws;

    this.ws.setConnectionStateListener(async (state) => {
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
          // if CONNECTED, authenticate, and then check link status
          try {
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

          break;

        case ConnectionState.CONNECTING:
          break;
      }

      // distinctUntilChanged
      if (connected === this.connected) return;

      this.connected = connected;
      this.connectedListener?.(connected);
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
          this.linkedListener?.(this.linked);
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
          this.sessionConfigListener?.({
            webhookId: msg.webhookId,
            webhookUrl: msg.webhookUrl,
            metadata: msg.metadata,
          });
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
  }

  // mark unseen events as seen
  private markUnseenEventsAsSeen(events: ServerMessageEvent[]) {
    const credentials = `${this.sessionId}:${this.sessionKey}`;
    const auth = `Basic ${btoa(credentials)}`;

    Promise.all(
      events.map((e) =>
        fetch(`${this.linkAPIUrl}/events/${e.eventId}/seen`, {
          method: 'POST',
          headers: {
            Authorization: auth,
          },
        })
      )
    ).catch((error) => console.error('Unabled to mark event as failed:', error));
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
    this.ws.disconnect();
    this.diagnostic?.log(EVENTS.DISCONNECTED, {
      sessionIdHash: Session.hash(this.sessionId),
    });
    this.destroyed = true;
  }

  public get isDestroyed(): boolean {
    return this.destroyed;
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

    this.incomingEventListener?.(m);
  }

  public async checkUnseenEvents() {
    if (!this.connected) {
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
    const credentials = `${this.sessionId}:${this.sessionKey}`;
    const auth = `Basic ${btoa(credentials)}`;

    const response = await fetch(`${this.linkAPIUrl}/events?unseen=true`, {
      headers: {
        Authorization: auth,
      },
    });

    if (response.ok) {
      const { events, error } = (await response.json()) as {
        events?: {
          id: string;
          event: 'Web3Request' | 'Web3Response' | 'Web3RequestCanceled';
          data: string;
        }[];
        timestamp: number;
        error?: string;
      };

      if (error) {
        throw new Error(`Check unseen events failed: ${error}`);
      }

      const responseEvents: ServerMessageEvent[] =
        events
          ?.filter((e) => e.event === 'Web3Response')
          .map((e) => ({
            type: 'Event',
            sessionId: this.sessionId,
            eventId: e.id,
            event: e.event,
            data: e.data,
          })) ?? [];
      responseEvents.forEach((e) => this.handleIncomingEvent(e));

      this.markUnseenEventsAsSeen(responseEvents);
    } else {
      throw new Error(`Check unseen events failed: ${response.status}`);
    }
  }

  /**
   * Set session metadata in SessionConfig object
   * @param key
   * @param value
   * @returns a Promise that completes when successful
   */
  public async setSessionMetadata(key: string, value: string | null) {
    if (!this.connected) {
      return;
    }

    const message = ClientMessageSetSessionConfig({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
      metadata: { [key]: value },
    });

    const res = await this.makeRequest<ServerMessageOK | ServerMessageFail>(message);
    if (isServerMessageFail(res)) {
      throw new Error(res.error || 'failed to set session metadata');
    }
  }

  /**
   * Publish an event and emit event ID when successful
   * @param event event name
   * @param data event data
   * @param callWebhook whether the webhook should be invoked
   * @returns a Promise that emits event ID when successful
   */
  public async publishEvent(event: string, data: string, callWebhook = false) {
    if (!this.linked) {
      return Promise.reject();
    }

    const message = ClientMessagePublishEvent({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
      event,
      data,
      callWebhook,
    });

    const res = await this.makeRequest<ServerMessagePublishEventOK | ServerMessageFail>(message);
    if (isServerMessageFail(res)) {
      throw new Error(res.error || 'failed to publish event');
    }
    return res.eventId;
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
}
