// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { ServerMessage } from '../type/ServerMessage';

export enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
}

export class WalletLinkWebSocket {
  // used to differentiate instances
  private static instanceCounter = 0;
  private static activeInstances = new Set<number>();

  private readonly instanceId: number;
  private readonly url: string;
  private webSocket: WebSocket | null = null;
  private pendingData: string[] = [];
  private isDisconnecting = false;

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
    this.instanceId = WalletLinkWebSocket.instanceCounter++;
    WalletLinkWebSocket.activeInstances.add(this.instanceId);
  }

  /**
   * Make a websocket connection
   * @returns a Promise that resolves when connected
   */
  public async connect() {
    if (this.webSocket) {
      throw new Error('webSocket object is not null');
    }
    if (this.isDisconnecting) {
      throw new Error('WebSocket is disconnecting, cannot reconnect on same instance');
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

        // Only reject the connection promise if we haven't connected yet
        if (webSocket.readyState !== WebSocket.OPEN) {
          reject(new Error(`websocket error ${evt.code}: ${evt.reason}`));
        }

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

    // Mark as disconnecting to prevent reconnection attempts on this instance
    this.isDisconnecting = true;
    this.clearWebSocket();

    // Clear listeners
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
      // no active ws - queue data
      this.pendingData.push(data);
      // Don't auto-connect if we're disconnecting - reconnect logic will handle sending data
      if (!this.isDisconnecting) {
        this.connect();
      }
      return;
    }

    // Check if WebSocket is actually open before sending
    if (webSocket.readyState !== WebSocket.OPEN) {
      this.pendingData.push(data);
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

  /**
   * remove ws from active instances
   */
  public cleanup(): void {
    WalletLinkWebSocket.activeInstances.delete(this.instanceId);
  }
}
