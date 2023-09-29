// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0
import { BehaviorSubject, merge, Observable, Subject, Subscription, throwError } from 'rxjs';
import { filter, map, take, timeoutWith } from 'rxjs/operators';

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
import { ConnectionState, RxWebSocket } from './RxWebSocket';
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
  private ws: RxWebSocket<ServerMessage>;
  private subscriptions = new Subscription();
  private destroyed = false;
  private lastHeartbeatResponse = 0;
  private nextReqId = IntNumber(1);
  private connected = false;
  private linkedSubject = new BehaviorSubject(false);
  private unseenEventsSubject = new Subject<ServerMessageEvent>();

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

  setIncomingEventListener(listener: (_: ServerMessageEvent) => void): void {
    this.subscribeIncomingEvent(listener);
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
    const ws = new RxWebSocket<ServerMessage>(`${linkAPIUrl}/rpc`, WebSocketClass);
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
            const reconnect = async () => {
              // wait 5 seconds
              await new Promise((resolve) => setTimeout(resolve, 5000));
              // check whether it's destroyed again
              if (!this.destroyed) {
                try {
                  // reconnect
                  await ws.connect().toPromise();
                } catch {
                  reconnect();
                }
              }
            };
            reconnect();
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

      this.connectedListener?.(connected);
      this.connected = connected;
    });

    // handle server's heartbeat responses
    this.subscriptions.add(
      ws.incomingData$.pipe(filter((m) => m === 'h')).subscribe((_) => this.updateLastHeartbeat())
    );

    // handle link status updates
    this.subscriptions.add(
      ws.incomingJSONData$
        .pipe(filter((m) => ['IsLinkedOK', 'Linked'].includes(m.type)))
        .subscribe((m) => {
          const msg = m as Omit<ServerMessageIsLinkedOK, 'type'> & ServerMessageLinked;
          this.diagnostic?.log(EVENTS.LINKED, {
            sessionIdHash: Session.hash(sessionId),
            linked: msg.linked,
            type: m.type,
            onlineGuests: msg.onlineGuests,
          });
          this.linkedSubject.next(msg.linked || msg.onlineGuests > 0);
          this.linkedListener?.(msg.linked || msg.onlineGuests > 0);
        })
    );

    // handle session config updates
    this.subscriptions.add(
      ws.incomingJSONData$
        .pipe(filter((m) => ['GetSessionConfigOK', 'SessionConfigUpdated'].includes(m.type)))
        .subscribe((m) => {
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
        })
    );

    // mark unseen events as seen
    this.subscriptions.add(
      this.unseenEventsSubject.subscribe((e) => {
        const credentials = `${this.sessionId}:${this.sessionKey}`;
        const auth = `Basic ${btoa(credentials)}`;

        fetch(`${this.linkAPIUrl}/events/${e.eventId}/seen`, {
          method: 'POST',
          headers: {
            Authorization: auth,
          },
        }).catch((error) => console.error('Unabled to mark event as failed:', error));
      })
    );
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
    this.ws.connect().subscribe();
  }

  /**
   * Terminate connection, and mark as destroyed. To reconnect, create a new
   * instance of WalletSDKConnection
   */
  public destroy(): void {
    this.subscriptions.unsubscribe();
    this.ws.disconnect();
    this.diagnostic?.log(EVENTS.DISCONNECTED, {
      sessionIdHash: Session.hash(this.sessionId),
    });
    this.destroyed = true;
  }

  public get isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Emit true if connected and authenticated, else false
   * Emit once connected
   * @returns an Promise
   */
  private get onceConnected$(): Promise<void> {
    return this.connectedSubject
      .pipe(
        filter((v) => v),
        take(1),
        map(() => void 0)
      )
      .toPromise();
  }

  /**
   * Emit true if linked (a guest has joined before)
   * Emit once when linked
   * @returns an Observable
   */
  private get onceLinked$(): Promise<void> {
    return this.linkedSubject
      .pipe(
        filter((v) => v),
        take(1),
        map(() => void 0)
      )
      .toPromise();
  }

  /**
   * Subscribe to incoming Event messages
   */
  private incomingEventSub?: Subscription;
  private subscribeIncomingEvent(listener: (_: ServerMessageEvent) => void): void {
    this.incomingEventSub?.unsubscribe();

    this.incomingEventSub = merge(this.ws.incomingJSONData$, this.unseenEventsSubject)
      .pipe(
        filter((m) => {
          if (m.type !== 'Event') {
            return false;
          }
          const sme = m as ServerMessageEvent;
          return (
            typeof sme.sessionId === 'string' &&
            typeof sme.eventId === 'string' &&
            typeof sme.event === 'string' &&
            typeof sme.data === 'string'
          );
        }),
        map((m) => m as ServerMessageEvent)
      )
      .subscribe((m) => {
        listener(m);
      });
  }

  public async checkUnseenEvents() {
    await this.onceConnected$;
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
      responseEvents.forEach((e) => this.unseenEventsSubject.next(e));
    } else {
      throw new Error(`Check unseen events failed: ${response.status}`);
    }
  }

  /**
   * Set session metadata in SessionConfig object
   * @param key
   * @param value
   * @returns an Observable that completes when successful
   */
  public setSessionMetadata(key: string, value: string | null): Promise<void> {
    const message = ClientMessageSetSessionConfig({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
      metadata: { [key]: value },
    });

    return this.onceConnected$
      .then(() => this.makeRequest<ServerMessageOK | ServerMessageFail>(message))
      .then((res) => {
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
   * @returns an Observable that emits event ID when successful
   */
  public publishEvent(event: string, data: string, callWebhook = false): Promise<string> {
    const message = ClientMessagePublishEvent({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
      event,
      data,
      callWebhook,
    });

    return this.onceLinked$
      .then(() => this.makeRequest<ServerMessagePublishEventOK | ServerMessageFail>(message))
      .then((res) => {
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

  private makeRequest<T extends ServerMessage>(
    message: ClientMessage,
    timeout: number = REQUEST_TIMEOUT
  ): Promise<T> {
    const reqId = message.id;
    this.sendData(message);

    // await server message with corresponding id
    return (this.ws.incomingJSONData$ as Observable<T>)
      .pipe(
        timeoutWith(timeout, throwError(new Error(`request ${reqId} timed out`))),
        filter((m) => m.id === reqId),
        take(1)
      )
      .toPromise();
  }

  private authenticate(): Promise<void> {
    const msg = ClientMessageHostSession({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
      sessionKey: this.sessionKey,
    });
    return this.makeRequest<ServerMessageOK | ServerMessageFail>(msg).then((res) => {
      if (isServerMessageFail(res)) {
        throw new Error(res.error || 'failed to authentcate');
      }
    });
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
