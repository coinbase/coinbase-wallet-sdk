// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { ServerMessage } from '../type/ServerMessage';

export enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
}

export interface WalletLinkWebSocketUpdateListener {
  websocketConnectionStateUpdated(state: ConnectionState): void;
  websocketMessageReceived(message: ServerMessage): void;
}

interface WalletLinkWebSocketParams {
  linkAPIUrl: string;
  listener: WalletLinkWebSocketUpdateListener;
  WebSocketClass?: typeof WebSocket;
}

export class WalletLinkWebSocket {
  private webSocket: WebSocket | null = null;
  private pendingData: string[] = [];

  private listener?: WalletLinkWebSocketUpdateListener;
  private readonly createWebSocket: () => WebSocket;

  /**
   * Constructor
   * @param linkAPIUrl Coinbase Wallet link server URL
   * @param listener WalletLinkWebSocketUpdateListener
   * @param [WebSocketClass] Custom WebSocket implementation
   */
  constructor({ linkAPIUrl, listener, WebSocketClass = WebSocket }: WalletLinkWebSocketParams) {
    this.listener = listener;

    const url = linkAPIUrl.replace(/^http/, 'ws').concat('/rpc');
    this.createWebSocket = () => new WebSocketClass(url);
  }

  /**
   * Make a websocket connection
   * @returns a Promise that resolves when connected
   */
  public async connect() {
    if (this.webSocket) {
      throw new Error('webSocket object is not null');
    }
    return new Promise<void>((resolve, reject) => {
      let webSocket: WebSocket;
      try {
        this.webSocket = webSocket = this.createWebSocket();
      } catch (err) {
        reject(err);
        return;
      }
      this.listener?.websocketConnectionStateUpdated(ConnectionState.CONNECTING);
      webSocket.onclose = (evt) => {
        this.clearWebSocket();
        reject(new Error(`websocket error ${evt.code}: ${evt.reason}`));
        this.listener?.websocketConnectionStateUpdated(ConnectionState.DISCONNECTED);
      };
      webSocket.onopen = (_) => {
        resolve();
        this.listener?.websocketConnectionStateUpdated(ConnectionState.CONNECTED);

        if (this.pendingData.length > 0) {
          const pending = [...this.pendingData];
          pending.forEach((data) => this.sendData(data));
          this.pendingData = [];
        }
      };
      webSocket.onmessage = (evt) => {
        if (evt.data === 'h') {
          this.listener?.websocketMessageReceived({
            type: 'Heartbeat',
          });
        } else {
          try {
            const message = JSON.parse(evt.data) as ServerMessage;
            this.listener?.websocketMessageReceived(message);
          } catch {
            /* empty */
          }
        }
      };
    });
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    const { webSocket } = this;
    if (!webSocket) {
      return;
    }
    this.clearWebSocket();

    this.listener?.websocketConnectionStateUpdated(ConnectionState.DISCONNECTED);
    this.listener = undefined;

    try {
      webSocket.close();
    } catch {
      // noop
    }
  }

  /**
   * Send data to server
   * @param data text to send
   */
  public sendData(data: string): void {
    const { webSocket } = this;
    if (!webSocket) {
      this.pendingData.push(data);
      this.connect();
      return;
    }
    webSocket.send(data);
  }

  private clearWebSocket(): void {
    const { webSocket } = this;
    if (!webSocket) {
      return;
    }
    this.webSocket = null;
    webSocket.onclose = null;
    webSocket.onerror = null;
    webSocket.onmessage = null;
    webSocket.onopen = null;
  }
}
