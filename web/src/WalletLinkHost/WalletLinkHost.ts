import { interval, Subscription } from "rxjs"
import { delay, filter, flatMap, retry, skip } from "rxjs/operators"
import { ConnectionState, RxWebSocket } from "./RxWebSocket"

const HEARTBEAT_INTERVAL = 10000

export class WalletLinkHost {
  private ws: RxWebSocket
  private subscriptions = new Subscription()
  private destroyed = false

  private heartbeatSub: Subscription | null = null
  private lastHeartbeat: number = 0

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

    // start heart beat when connected, and stop when disconnected
    this.subscriptions.add(
      ws.connectionState$.pipe(skip(1)).subscribe(cs => {
        if (cs === ConnectionState.CONNECTED) {
          this.startHeartbeat()
        } else if (cs === ConnectionState.DISCONNECTED) {
          this.stopHeartbeat()
        }
      })
    )

    // handle heartbeat messages
    this.subscriptions.add(
      ws.incomingData$.pipe(filter(m => m === "h")).subscribe(_ => {
        this.lastHeartbeat = Date.now()
      })
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
    this.stopHeartbeat()
    this.ws.disconnect()
    this.destroyed = true
  }

  private startHeartbeat(): void {
    if (this.heartbeatSub) {
      return
    }
    this.lastHeartbeat = Date.now()
    this.heartbeatSub = interval(HEARTBEAT_INTERVAL).subscribe(_ => {
      if (Date.now() - this.lastHeartbeat > HEARTBEAT_INTERVAL * 2) {
        this.ws.disconnect()
        return
      }
      try {
        this.ws.sendData("h")
      } catch {}
    })
  }

  private stopHeartbeat(): void {
    if (!this.heartbeatSub) {
      return
    }
    this.heartbeatSub.unsubscribe()
    this.heartbeatSub = null
  }
}
