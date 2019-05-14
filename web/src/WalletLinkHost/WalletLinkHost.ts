import {
  BehaviorSubject,
  iif,
  Observable,
  of,
  race,
  Subscription,
  throwError,
  timer
} from "rxjs"
import {
  delay,
  distinctUntilChanged,
  filter,
  flatMap,
  map,
  retry,
  skip,
  switchMap
} from "rxjs/operators"
import {
  ClientMessage,
  ClientMessageHostSession,
  ServerMessage,
  ServerMessageFail,
  ServerMessageOK
} from "./messages"
import { ConnectionState, RxWebSocket } from "./RxWebSocket"

const HEARTBEAT_INTERVAL = 10000
const REQUEST_TIMEOUT = 60000

export class WalletLinkHost {
  private ws: RxWebSocket
  private subscriptions = new Subscription()
  private destroyed = false
  private lastHeartbeatResponse = 0
  private nextReqId = 0
  private readySubject = new BehaviorSubject(false)

  constructor(
    private sessionId: string,
    private sessionKey: string,
    rpcUrl: string,
    WebSocketClass: typeof WebSocket = WebSocket
  ) {
    const ws = (this.ws = new RxWebSocket(rpcUrl, WebSocketClass))

    // attempt to reconnect every 5 seconds when disconnected
    this.subscriptions.add(
      ws.connectionState$
        .pipe(
          skip(1),
          filter(cs => cs === ConnectionState.DISCONNECTED && !this.destroyed),
          delay(5000),
          filter(_ => !this.destroyed),
          flatMap(_ => ws.connect$),
          retry()
        )
        .subscribe()
    )

    // perform authentication upon connection
    this.subscriptions.add(
      ws.connectionState$
        .pipe(
          // skip initial DISCONNECTED and CONNECTING
          skip(2),
          // if connected, attempt to authenticate, else emit false
          switchMap(cs =>
            iif(
              () => cs === ConnectionState.CONNECTED,
              this.authenticate(),
              of(false)
            )
          ),
          distinctUntilChanged()
        )
        .subscribe(isReady => this.readySubject.next(isReady))
    )

    // send heartbeat every n seconds while connected
    this.subscriptions.add(
      ws.connectionState$
        .pipe(
          skip(1),
          switchMap(cs =>
            iif(
              () => cs === ConnectionState.CONNECTED,
              timer(0, HEARTBEAT_INTERVAL)
            )
          )
        )
        .subscribe(i =>
          i === 0 ? this.updateLastHeartbeat() : this.heartbeat()
        )
    )

    // handle server's heartbeat responses
    this.subscriptions.add(
      ws.incomingData$
        .pipe(filter(m => m === "h"))
        .subscribe(_ => this.updateLastHeartbeat())
    )
  }

  public connect(): void {
    if (this.destroyed) {
      throw new Error("instance is destroyed")
    }
    this.ws.connect$.subscribe()
  }

  public destroy(): void {
    this.subscriptions.unsubscribe()
    this.ws.disconnect()
    this.destroyed = true
  }

  /**
   * emits true if connected and authenticated, else false
   */
  public get ready$(): Observable<boolean> {
    return this.readySubject.asObservable()
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
      this.ws.sendData(JSON.stringify(message))
    } catch (err) {
      return throwError(err)
    }
    return race(
      this.ws.incomingJSONData$.pipe(
        filter((m: ServerMessage) => m.id === reqId)
      ),
      timer(timeout).pipe(
        flatMap(_ => throwError(`request ${reqId} timed out`))
      )
    )
  }

  private authenticate(): Observable<boolean> {
    const hostSession = ClientMessageHostSession(
      this.nextReqId++,
      this.sessionId,
      this.sessionKey
    )
    return this.makeRequest<ServerMessageOK | ServerMessageFail>(
      hostSession
    ).pipe(map(res => res.type === "OK"))
  }
}
