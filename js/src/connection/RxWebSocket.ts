// Copyright (c) 2018-2020 WalletLink.org <https://www.walletlink.org/>
// Copyright (c) 2018-2020 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

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

/**
 * Rx-ified WebSocket
 */
export class RxWebSocket<T = object> {
  private readonly url: string
  private webSocket: WebSocket | null = null
  private connectionStateSubject = new BehaviorSubject<ConnectionState>(
    ConnectionState.DISCONNECTED
  )
  private incomingDataSubject = new Subject<string>()

  /**
   * Constructor
   * @param url WebSocket server URL
   * @param [WebSocketClass] Custom WebSocket implementation
   */
  constructor(
    url: string,
    private readonly WebSocketClass: typeof WebSocket = WebSocket
  ) {
    this.url = url.replace(/^http/, "ws")
  }

  /**
   * Make a websocket connection
   * @returns an Observable that completes when connected
   */
  public connect(): Observable<void> {
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

  /**
   * Disconnect from server
   */
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

  /**
   * Emit current connection state and subsequent changes
   * @returns an Observable for the connection state
   */
  public get connectionState$(): Observable<ConnectionState> {
    return this.connectionStateSubject.asObservable()
  }

  /**
   * Emit incoming data from server
   * @returns an Observable for the data received
   */
  public get incomingData$(): Observable<string> {
    return this.incomingDataSubject.asObservable()
  }

  /**
   * Emit incoming JSON data from server. non-JSON data are ignored
   * @returns an Observable for parsed JSON data
   */
  public get incomingJSONData$(): Observable<T> {
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

  /**
   * Send data to server
   * @param data text to send
   */
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
