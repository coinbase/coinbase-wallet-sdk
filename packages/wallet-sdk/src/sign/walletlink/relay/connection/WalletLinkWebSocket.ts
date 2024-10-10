// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import { ServerMessage } from '../type/ServerMessage.js';

export enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
}

export class WalletLinkWebSocket {
  private readonly url: string;
  private webSocket: WebSocket | null = null;
  private pendingData: string[] = [];

  private connectionStateListener?: (_: ConnectionState) => void;
  setConnectionStateListener(listener: (_: ConnectionState) => void): void {
    this.connectionStateListener = listener;
  }

  private incomingDataListener?: (_: ServerMessage) => void;
  setIncomingDataListener(listener: (_: ServerMessage) => void): void {
    this.incomingDataListener = listener;
  }

  /**
   * Constructor
   * @param url WebSocket server URL
   * @param [WebSocketClass] Custom WebSocket implementation
   */
  constructor(
    url: string,
    private readonly WebSocketClass: typeof WebSocket = WebSocket
  ) {
    this.url = url.replace(/^http/, 'ws');
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
        this.webSocket = webSocket = new this.WebSocketClass(this.url);
      } catch (err) {
        reject(err);
        return;
      }
      this.connectionStateListener?.(ConnectionState.CONNECTING);
      webSocket.onclose = (evt) => {
        this.clearWebSocket();
        reject(new Error(`websocket error ${evt.code}: ${evt.reason}`));
        this.connectionStateListener?.(ConnectionState.DISCONNECTED);
      };
      webSocket.onopen = (_) => {
        resolve();
        this.connectionStateListener?.(ConnectionState.CONNECTED);

        if (this.pendingData.length > 0) {
          const pending = [...this.pendingData];
          pending.forEach((data) => this.sendData(data));
          this.pendingData = [];
        }
      };
      webSocket.onmessage = (evt) => {
        if (evt.data === 'h') {
          this.incomingDataListener?.({
            type: 'Heartbeat',
          });
        } else {
          try {
            const message = JSON.parse(evt.data) as ServerMessage;
            this.incomingDataListener?.(message);
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

    this.connectionStateListener?.(ConnectionState.DISCONNECTED);
    this.connectionStateListener = undefined;
    this.incomingDataListener = undefined;

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
