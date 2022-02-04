// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import {
  BehaviorSubject,
  iif,
  Observable,
  of,
  ReplaySubject, Subject,
  Subscription,
  throwError,
  timer
} from "rxjs"
import {
  catchError,
  delay,
  distinctUntilChanged,
  filter,
  flatMap,
  map,
  retry,
  skip,
  switchMap,
  take,
  tap,
  timeoutWith
} from "rxjs/operators"

import { EVENTS, WalletLinkAnalyticsAbstract } from "../init"
import { Session } from "../relay/Session"
import { IntNumber } from "../types"
import {
  ClientMessage,
  ClientMessageGetSessionConfig,
  ClientMessageHostSession,
  ClientMessageIsLinked,
  ClientMessagePublishEvent,
  ClientMessageSetSessionConfig
} from "./ClientMessage"
import { ConnectionState, RxWebSocket } from "./RxWebSocket"
import {
  ChainUpdate,
  isServerMessageFail,
  ServerMessage,
  ServerMessageEvent,
  ServerMessageFail,
  ServerMessageGetSessionConfigOK,
  ServerMessageIsLinkedOK,
  ServerMessageLinked,
  ServerMessageOK,
  ServerMessagePublishEventOK,
  ServerMessageSessionConfigUpdated
} from "./ServerMessage"
import { SessionConfig } from "./SessionConfig"

const HEARTBEAT_INTERVAL = 10000
const REQUEST_TIMEOUT = 60000

/**
 * WalletLink Connection
 */
export class WalletLinkConnection {
  private ws: RxWebSocket<ServerMessage>
  private subscriptions = new Subscription()
  private destroyed = false
  private lastHeartbeatResponse = 0
  private nextReqId = IntNumber(1)
  private connectedSubject = new BehaviorSubject(false)
  private linkedSubject = new BehaviorSubject(false)
  private sessionConfigSubject = new ReplaySubject<SessionConfig>(1)
  private chainUpdateSubject = new Subject<ChainUpdate>()
  private walletLinkAnalytics: WalletLinkAnalyticsAbstract

  /**
   * Constructor
   * @param sessionId Session ID
   * @param sessionKey Session Key
   * @param serverUrl Walletlinkd RPC URL
   * @param [WebSocketClass] Custom WebSocket implementation
   */
  constructor(
    private sessionId: string,
    private sessionKey: string,
    serverUrl: string,
    walletLinkAnalytics: WalletLinkAnalyticsAbstract,
    WebSocketClass: typeof WebSocket = WebSocket
  ) {
    const ws = new RxWebSocket<ServerMessage>(
      serverUrl + "/rpc",
      WebSocketClass
    )
    this.ws = ws
    this.walletLinkAnalytics = walletLinkAnalytics

    // attempt to reconnect every 5 seconds when disconnected
    this.subscriptions.add(
      ws.connectionState$
        .pipe(
          tap(state =>
            this.walletLinkAnalytics.sendEvent(EVENTS.CONNECTED_STATE_CHANGE, {
              state,
              sessionIdHash: Session.hash(sessionId)
            })
          ),
          // ignore initial DISCONNECTED state
          skip(1),
          // if DISCONNECTED and not destroyed
          filter(cs => cs === ConnectionState.DISCONNECTED && !this.destroyed),
          // wait 5 seconds
          delay(5000),
          // check whether it's destroyed again
          filter(_ => !this.destroyed),
          // reconnect
          flatMap(_ => ws.connect()),
          retry()
        )
        .subscribe()
    )

    // perform authentication upon connection
    this.subscriptions.add(
      ws.connectionState$
        .pipe(
          // ignore initial DISCONNECTED and CONNECTING states
          skip(2),
          switchMap(cs =>
            iif(
              () => cs === ConnectionState.CONNECTED,
              // if CONNECTED, authenticate, and then check link status
              this.authenticate().pipe(
                tap(_ => this.sendIsLinked()),
                tap(_ => this.sendGetSessionConfig()),
                map(_ => true)
              ),
              // if not CONNECTED, emit false immediately
              of(false)
            )
          ),
          distinctUntilChanged(),
          catchError(_ => of(false))
        )
        .subscribe(connected => this.connectedSubject.next(connected))
    )

    // send heartbeat every n seconds while connected
    this.subscriptions.add(
      ws.connectionState$
        .pipe(
          // ignore initial DISCONNECTED state
          skip(1),
          switchMap(cs =>
            iif(
              () => cs === ConnectionState.CONNECTED,
              // if CONNECTED, start the heartbeat timer
              timer(0, HEARTBEAT_INTERVAL)
            )
          )
        )
        .subscribe(i =>
          // first timer event updates lastHeartbeat timestamp
          // subsequent calls send heartbeat message
          i === 0 ? this.updateLastHeartbeat() : this.heartbeat()
        )
    )

    // handle server's heartbeat responses
    this.subscriptions.add(
      ws.incomingData$
        .pipe(filter(m => m === "h"))
        .subscribe(_ => this.updateLastHeartbeat())
    )

    // handle link status updates
    this.subscriptions.add(
      ws.incomingJSONData$
        .pipe(filter(m => ["IsLinkedOK", "Linked"].includes(m.type)))
        .subscribe(m => {
          const msg = m as Omit<ServerMessageIsLinkedOK, "type"> &
            ServerMessageLinked
          this.walletLinkAnalytics.sendEvent(EVENTS.LINKED, {
            sessionIdHash: Session.hash(sessionId),
            linked: msg.linked,
            type: m.type,
            onlineGuests: msg.onlineGuests
          })
          this.linkedSubject.next(msg.linked || msg.onlineGuests > 0)
        })
    )

    this.subscriptions.add(
      ws.incomingJSONData$
        .pipe(
          filter(m =>
            m.type == "SetChainId"
          )
        )
        .subscribe(m => {
          const msg = m as ChainUpdate
          this.chainUpdateSubject.next(msg)
        })
    )

    // handle session config updates
    this.subscriptions.add(
      ws.incomingJSONData$
        .pipe(
          filter(m =>
            ["GetSessionConfigOK", "SessionConfigUpdated"].includes(m.type)
          )
        )
        .subscribe(m => {
          const msg = m as Omit<ServerMessageGetSessionConfigOK, "type"> &
            ServerMessageSessionConfigUpdated
          this.walletLinkAnalytics.sendEvent(EVENTS.SESSION_CONFIG_RECEIVED, {
            sessionIdHash: Session.hash(sessionId),
            metadata_keys:
              msg && msg.metadata ? Object.keys(msg.metadata) : undefined
          })
          this.sessionConfigSubject.next({
            webhookId: msg.webhookId,
            webhookUrl: msg.webhookUrl,
            metadata: msg.metadata
          })
        })
    )
  }

  /**
   * Make a connection to the server
   */
  public connect(): void {
    if (this.destroyed) {
      throw new Error("instance is destroyed")
    }
    this.walletLinkAnalytics.sendEvent(EVENTS.STARTED_CONNECTING, {
      sessionIdHash: Session.hash(this.sessionId)
    })
    this.ws.connect().subscribe()
  }

  /**
   * Terminate connection, and mark as destroyed. To reconnect, create a new
   * instance of WalletLinkConnection
   */
  public destroy(): void {
    this.subscriptions.unsubscribe()
    this.ws.disconnect()
    this.walletLinkAnalytics.sendEvent(EVENTS.DISCONNECTED, {
      sessionIdHash: Session.hash(this.sessionId)
    })
    this.destroyed = true
  }

  public get isDestroyed(): boolean {
    return this.destroyed
  }

  /**
   * Emit true if connected and authenticated, else false
   * @returns an Observable
   */
  public get connected$(): Observable<boolean> {
    return this.connectedSubject.asObservable()
  }

  /**
   * Emit once connected
   * @returns an Observable
   */
  public get onceConnected$(): Observable<void> {
    return this.connected$.pipe(
      filter(v => v),
      take(1),
      map(() => void 0)
    )
  }

  /**
   * Emit true if linked (a guest has joined before)
   * @returns an Observable
   */
  public get linked$(): Observable<boolean> {
    return this.linkedSubject.asObservable()
  }

  /**
   * Emit once when linked
   * @returns an Observable
   */
  public get onceLinked$(): Observable<void> {
    return this.linked$.pipe(
      filter(v => v),
      take(1),
      map(() => void 0)
    )
  }

  /**
   * Emit current session config if available, and subsequent updates
   * @returns an Observable for the session config
   */
  public get sessionConfig$(): Observable<SessionConfig> {
    return this.sessionConfigSubject.asObservable()
  }

  public get chainUpdate$(): Observable<ChainUpdate> {
    return this.chainUpdateSubject.asObservable()
  }

  /**
   * Emit incoming Event messages
   * @returns an Observable for the messages
   */
  public get incomingEvent$(): Observable<ServerMessageEvent> {
    return this.ws.incomingJSONData$.pipe(
      filter(m => {
        if (m.type !== "Event") {
          return false
        }
        const sme = m as ServerMessageEvent
        return (
          typeof sme.sessionId === "string" &&
          typeof sme.eventId === "string" &&
          typeof sme.event === "string" &&
          typeof sme.data === "string"
        )
      }),
      map(m => m as ServerMessageEvent)
    )
  }

  /**
   * Set session metadata in SessionConfig object
   * @param key
   * @param value
   * @returns an Observable that completes when successful
   */
  public setSessionMetadata(
    key: string,
    value: string | null
  ): Observable<void> {
    const message = ClientMessageSetSessionConfig({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
      metadata: { [key]: value }
    })

    return this.onceConnected$.pipe(
      flatMap(_ =>
        this.makeRequest<ServerMessageOK | ServerMessageFail>(message)
      ),
      map(res => {
        if (isServerMessageFail(res)) {
          throw new Error(res.error || "failed to set session metadata")
        }
      })
    )
  }

  /**
   * Publish an event and emit event ID when successful
   * @param event event name
   * @param data event data
   * @param callWebhook whether the webhook should be invoked
   * @returns an Observable that emits event ID when successful
   */
  public publishEvent(
    event: string,
    data: string,
    callWebhook = false
  ): Observable<string> {
    const message = ClientMessagePublishEvent({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
      event,
      data,
      callWebhook
    })

    return this.onceLinked$.pipe(
      flatMap(_ =>
        this.makeRequest<ServerMessagePublishEventOK | ServerMessageFail>(
          message
        )
      ),
      map(res => {
        if (isServerMessageFail(res)) {
          throw new Error(res.error || "failed to publish event")
        }
        return res.eventId
      })
    )
  }

  private sendData(message: ClientMessage): void {
    this.ws.sendData(JSON.stringify(message))
  }

  private updateLastHeartbeat(): void {
    this.lastHeartbeatResponse = Date.now()
  }

  private heartbeat(): void {
    if (Date.now() - this.lastHeartbeatResponse > HEARTBEAT_INTERVAL * 2) {
      this.ws.disconnect()
      return
    }
    try {
      this.ws.sendData("h")
    } catch {}
  }

  private makeRequest<T extends ServerMessage>(
    message: ClientMessage,
    timeout: number = REQUEST_TIMEOUT
  ): Observable<T> {
    const reqId = message.id
    try {
      this.sendData(message)
    } catch (err) {
      return throwError(err)
    }

    // await server message with corresponding id
    return (this.ws.incomingJSONData$ as Observable<T>).pipe(
      timeoutWith(timeout, throwError(new Error(`request ${reqId} timed out`))),
      filter(m => m.id === reqId),
      take(1)
    )
  }

  private authenticate(): Observable<void> {
    const msg = ClientMessageHostSession({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId,
      sessionKey: this.sessionKey
    })
    return this.makeRequest<ServerMessageOK | ServerMessageFail>(msg).pipe(
      map(res => {
        if (isServerMessageFail(res)) {
          throw new Error(res.error || "failed to authentcate")
        }
      })
    )
  }

  private sendIsLinked(): void {
    const msg = ClientMessageIsLinked({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId
    })
    this.sendData(msg)
  }

  private sendGetSessionConfig(): void {
    const msg = ClientMessageGetSessionConfig({
      id: IntNumber(this.nextReqId++),
      sessionId: this.sessionId
    })
    this.sendData(msg)
  }
}
