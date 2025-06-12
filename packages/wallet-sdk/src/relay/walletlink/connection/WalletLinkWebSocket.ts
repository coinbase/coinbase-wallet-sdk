// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { ServerMessage } from '../type/ServerMessage';

export enum ConnectionState {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
}

export class WalletLinkWebSocket {
  private static instanceCounter = 0;
  private static activeInstances = new Set<number>();
  
  private readonly instanceId: number;
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
    console.debug('[WalletLinkWebSocket] Initialized with URL:', this.url);
    this.instanceId = WalletLinkWebSocket.instanceCounter++;
    WalletLinkWebSocket.activeInstances.add(this.instanceId);
    console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} created. URL: ${this.url}. Total active instances: ${WalletLinkWebSocket.activeInstances.size}`);
    console.debug(`[WalletLinkWebSocket] Active instance IDs:`, Array.from(WalletLinkWebSocket.activeInstances));
  }

  /**
   * Make a websocket connection
   * @returns a Promise that resolves when connected
   */
  public async connect() {
    if (this.webSocket) {
      throw new Error('webSocket object is not null');
    }
    console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} starting connection attempt to: ${this.url}. Active instances: ${WalletLinkWebSocket.activeInstances.size}`);
    return new Promise<void>((resolve, reject) => {
      let webSocket: WebSocket;
      try {
        this.webSocket = webSocket = new this.WebSocketClass(this.url);
      } catch (err) {
        console.error(`[WalletLinkWebSocket] Instance #${this.instanceId} failed to create WebSocket:`, err);
        reject(err);
        return;
      }
      this.connectionStateListener?.(ConnectionState.CONNECTING);
      console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} state changed to: CONNECTING`);
      
      webSocket.onerror = (evt) => {
        console.error(`[WalletLinkWebSocket] Instance #${this.instanceId} error occurred:`, evt);
      };
      
      webSocket.onclose = (evt) => {
        console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} closed. Code: ${evt.code}, Reason: ${evt.reason}, Clean: ${evt.wasClean}`);
        console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} close code meanings: 1000=Normal, 1001=Going Away, 1006=Abnormal, 1009=Message Too Big, 1011=Server Error`);
        this.clearWebSocket();
        
        // Only reject the connection promise if we haven't connected yet
        if (webSocket.readyState !== WebSocket.OPEN) {
          reject(new Error(`websocket error ${evt.code}: ${evt.reason}`));
        }
        
        this.connectionStateListener?.(ConnectionState.DISCONNECTED);
        console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} state changed to: DISCONNECTED`);
      };
      
      webSocket.onopen = (_) => {
        console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} connection opened successfully`);
        resolve();
        this.connectionStateListener?.(ConnectionState.CONNECTED);
        console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} state changed to: CONNECTED`);

        if (this.pendingData.length > 0) {
          console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} sending ${this.pendingData.length} pending messages`);
          const pending = [...this.pendingData];
          pending.forEach((data) => {
            console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} sending pending data:`, data);
            this.sendData(data);
          });
          this.pendingData = [];
        }
      };
      
      webSocket.onmessage = (evt) => {
        console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} received message:`, evt.data);
        if (evt.data === 'h') {
          console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} received heartbeat`);
          this.incomingDataListener?.({
            type: 'Heartbeat',
          });
        } else {
          try {
            const message = JSON.parse(evt.data) as ServerMessage;
            console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} parsed message:`, message);
            this.incomingDataListener?.(message);
          } catch (error) {
            console.error(`[WalletLinkWebSocket] Instance #${this.instanceId} failed to parse message:`, evt.data, 'Error:', error);
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
      console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} disconnect called but no active connection`);
      return;
    }
    console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} disconnecting. Active instances before disconnect: ${WalletLinkWebSocket.activeInstances.size}`);
    this.clearWebSocket();

    this.connectionStateListener?.(ConnectionState.DISCONNECTED);
    console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} state changed to: DISCONNECTED`);
    this.connectionStateListener = undefined;
    this.incomingDataListener = undefined;

    try {
      webSocket.close();
      console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} closed successfully`);
    } catch (error) {
      console.error(`[WalletLinkWebSocket] Instance #${this.instanceId} error closing WebSocket:`, error);
    }
  }

  /**
   * Send data to server
   * @param data text to send
   */
  public sendData(data: string): void {
    const { webSocket } = this;
    if (!webSocket) {
      console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} no active connection, queuing data:`, data);
      this.pendingData.push(data);
      this.connect();
      return;
    }
    
    // Check if WebSocket is actually open before sending
    if (webSocket.readyState !== WebSocket.OPEN) {
      console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} WebSocket not open (state: ${webSocket.readyState}), queuing data:`, data);
      this.pendingData.push(data);
      return;
    }
    
    console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} sending data:`, data);
    webSocket.send(data);
  }

      private clearWebSocket(): void {
      const { webSocket } = this;
      if (!webSocket) {
        return;
      }
      console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} clearing event handlers`);
      this.webSocket = null;
      webSocket.onclose = null;
      webSocket.onerror = null;
      webSocket.onmessage = null;
      webSocket.onopen = null;
    }

  public static getActiveInstances(): number {
    return WalletLinkWebSocket.activeInstances.size;
  }

  /**
   * Cleanup instance tracking - should be called when the instance is no longer needed
   */
  public cleanup(): void {
    console.debug(`[WalletLinkWebSocket] Instance #${this.instanceId} cleanup called. Removing from active instances.`);
    WalletLinkWebSocket.activeInstances.delete(this.instanceId);
    console.debug(`[WalletLinkWebSocket] Active instances after cleanup: ${WalletLinkWebSocket.activeInstances.size}`);
    console.debug(`[WalletLinkWebSocket] Remaining active instance IDs:`, Array.from(WalletLinkWebSocket.activeInstances));
  }
}
