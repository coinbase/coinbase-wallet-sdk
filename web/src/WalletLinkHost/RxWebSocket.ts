import {
  BehaviorSubject,
  empty,
  Observable,
  of,
  Subject,
  throwError
} from "rxjs"
import { flatMap, take } from "rxjs/operators"

export enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED
}

export class RxWebSocket {
  private webSocket: WebSocket | null = null
  private connectionStateSubject = new BehaviorSubject<ConnectionState>(
    ConnectionState.DISCONNECTED
  )
  private incomingDataSubject = new Subject<string>()

  constructor(
    private url: string,
    private WebSocketClass: typeof WebSocket = WebSocket
  ) {}

  public get connect$(): Observable<void> {
    if (this.webSocket) {
      return throwError(new Error("webSocket object is not null"))
    }
    return new Observable<void>(obs => {
      let webSocket: WebSocket
      try {
        this.webSocket = webSocket = new this.WebSocketClass(this.url)
      } catch (err) {
        obs.error(err)
        return
      }
      this.connectionStateSubject.next(ConnectionState.CONNECTING)
      webSocket.onclose = evt => {
        this.clearWebSocket()
        obs.error(new Error(`websocket error ${evt.code}: ${evt.reason}`))
        this.connectionStateSubject.next(ConnectionState.DISCONNECTED)
      }
      webSocket.onopen = _ => {
        obs.next()
        obs.complete()
        this.connectionStateSubject.next(ConnectionState.CONNECTED)
      }
      webSocket.onmessage = evt => {
        this.incomingDataSubject.next(evt.data as string)
      }
    }).pipe(take(1))
  }

  public disconnect(): void {
    const { webSocket } = this
    if (!webSocket) {
      return
    }
    this.clearWebSocket()
    this.connectionStateSubject.next(ConnectionState.DISCONNECTED)
    try {
      webSocket.close()
    } catch {}
  }

  public get connectionState$(): Observable<ConnectionState> {
    return this.connectionStateSubject.asObservable()
  }

  public get incomingData$(): Observable<string> {
    return this.incomingDataSubject.asObservable()
  }

  public get incomingJSONData$(): any {
    return this.incomingData$.pipe(
      flatMap(m => {
        let j: any
        try {
          j = JSON.parse(m)
        } catch (err) {
          return empty()
        }
        return of(j)
      })
    )
  }

  public sendData(data: string): void {
    const { webSocket } = this
    if (!webSocket) {
      throw new Error("websocket is not connected")
    }
    webSocket.send(data)
  }

  private clearWebSocket(): void {
    const { webSocket } = this
    if (!webSocket) {
      return
    }
    this.webSocket = null
    webSocket.onclose = null
    webSocket.onerror = null
    webSocket.onmessage = null
    webSocket.onopen = null
  }
}
