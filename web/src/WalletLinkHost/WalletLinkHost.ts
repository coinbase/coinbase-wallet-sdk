import { iif, Subscription, timer } from "rxjs"
import { delay, filter, flatMap, retry, skip, switchMap } from "rxjs/operators"
import { ConnectionState, RxWebSocket } from "./RxWebSocket"

const HEARTBEAT_INTERVAL = 10000

export class WalletLinkHost {
  private ws: RxWebSocket
  private subscriptions = new Subscription()
  private destroyed = false

  private lastHeartbeatResponse = 0

  constructor(url: string, WebSocketClass: typeof WebSocket = WebSocket) {
    const ws = (this.ws = new RxWebSocket(url, WebSocketClass))

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
}
