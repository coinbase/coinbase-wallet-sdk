import { Subscription } from "rxjs"
import { delay, filter, flatMap, retry, skip } from "rxjs/operators"
import { ConnectionState, RxWebSocket } from "./RxWebSocket"

export class WalletLinkHost {
  private ws: RxWebSocket
  private subscriptions = new Subscription()
  private destroyed = false

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
}
