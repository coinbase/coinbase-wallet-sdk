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

/**
 * Provides WalletLink host interactions
 */
export class WalletLinkHost {
  private ws: RxWebSocket
  private subscriptions = new Subscription()
  private destroyed = false
  private lastHeartbeatResponse = 0
  private nextReqId = 0
  private readySubject = new BehaviorSubject(false)

  /**
   * @param sessionId Session ID
   * @param sessionKey Session Key
   * @param rpcUrl Walletlinkd RPC URL
   * @param [WebSocketClass] Custom WebSocket implementation
   */
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
              // if CONNECTED, attempt to authenticate
              this.authenticate(),
              // if not CONNECTED, emit false immediately
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
  }

  /**
   * Make a connection to the server
   */
  public connect(): void {
    if (this.destroyed) {
      throw new Error("instance is destroyed")
    }
    this.ws.connect().subscribe()
  }

  /**
   * Terminate connection, and mark as destroyed. To reconnect, create a new
   * instance of WalletLinkHost
   */
  public destroy(): void {
    this.subscriptions.unsubscribe()
    this.ws.disconnect()
    this.destroyed = true
  }

  /**
   * Emits true if connected and authenticated, else false
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
      // await server message with corresponding id
      this.ws.incomingJSONData$.pipe(
        filter((m: ServerMessage) => m.id === reqId)
      ),
      // or error out if timeout happens first
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
