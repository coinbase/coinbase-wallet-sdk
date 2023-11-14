// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { Session } from '../relay/Session';
import { IntNumber } from '../types';
import {
  ClientMessage,
  ClientMessageGetSessionConfig,
  ClientMessageHostSession,
  ClientMessageIsLinked,
} from './ClientMessage';
import {
  isServerMessageFail,
  ServerMessage,
  ServerMessageFail,
  ServerMessageOK,
} from './ServerMessage';

const REQUEST_TIMEOUT = 60000;
const HEARTBEAT_INTERVAL = 10000;

export interface WalletLinkWebSocketUpdateListener {
  websocketConnected(): void;
  websocketDisconnected(): void;
  websocketMessageReceived(message: ServerMessage): void;
}

interface WalletLinkWebSocketParams {
  linkAPIUrl: string;
  session: Session;
  listener: WalletLinkWebSocketUpdateListener;
  WebSocketClass?: typeof WebSocket;
}

export class WalletLinkWebSocket {
  private lastHeartbeatResponse = 0;
  private nextReqId = IntNumber(1);
  private webSocket: WebSocket | null = null;
  private pendingData: ClientMessage[] = [];

  private readonly session: Session;
  private listener?: WalletLinkWebSocketUpdateListener;
  private readonly createWebSocket: () => WebSocket;

  /**
   * Constructor
   * @param linkAPIUrl Coinbase Wallet link server URL
   * @param listener WalletLinkWebSocketUpdateListener
   * @param [WebSocketClass] Custom WebSocket implementation
   */
  constructor({
    linkAPIUrl,
    session,
    listener,
    WebSocketClass = WebSocket,
  }: WalletLinkWebSocketParams) {
    this.session = session;
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
      webSocket.onmessage = this.onmessage;
      webSocket.onclose = (evt) => {
        this.clearWebSocket();
        reject(new Error(`websocket error ${evt.code}: ${evt.reason}`));
        this.listener?.websocketDisconnected();
      };
      webSocket.onopen = (_) => {
        resolve();
        this.listener?.websocketConnected();
        this.handleWebsocketOpen();
      };
    });
  }

  private async handleWebsocketOpen() {
    // perform authentication upon connection
    // const connected = false;
    try {
      // if CONNECTED, authenticate, and then check link status
      await this.authenticate();
      this.sendIsLinked();
      this.sendGetSessionConfig();
      // connected = true;
    } catch {
      /* empty */
    }

    // send heartbeat every n seconds while connected
    // if CONNECTED, start the heartbeat timer
    // first timer event updates lastHeartbeat timestamp
    // subsequent calls send heartbeat message
    this.updateLastHeartbeat();
    setInterval(() => {
      this.heartbeat();
    }, HEARTBEAT_INTERVAL);

    this.sendPendingMessages();
  }

  private sendPendingMessages() {
    if (this.pendingData.length > 0) {
      const pending = [...this.pendingData];
      pending.forEach((data) => this.sendMessage(data));
      this.pendingData = [];
    }
  }

  onmessage = (evt: MessageEvent) => {
    if (evt.data === 'h') {
      this.listener?.websocketMessageReceived({
        type: 'Heartbeat',
      });
    } else {
      try {
        const message = JSON.parse(evt.data) as ServerMessage;
        this.listener?.websocketMessageReceived(message);

        const m = message as ServerMessage;
        // resolve request promises
        if (m.id !== undefined) {
          this.requestResolutions.get(m.id)?.(m);
        }
      } catch {
        /* empty */
      }
    }
  };

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    const { webSocket } = this;
    if (!webSocket) {
      return;
    }
    this.clearWebSocket();

    this.listener?.websocketDisconnected();
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
  sendMessage(message: ClientMessage): void {
    const { webSocket } = this;
    if (!webSocket) {
      this.pendingData.push(message);
      this.connect();
      return;
    }
    const data = JSON.stringify(message);
    webSocket.send(data);
  }

  private requestResolutions = new Map<IntNumber, (_: ServerMessage) => void>();

  async makeRequest<T extends ServerMessage>(
    message: Omit<ClientMessage, 'id'>,
    timeout: number = REQUEST_TIMEOUT
  ): Promise<T> {
    const reqId = IntNumber(this.nextReqId++);
    this.sendMessage({
      ...message,
      id: reqId,
    });

    // await server message with corresponding id
    let timeoutId: number;
    return Promise.race([
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(`request ${reqId} timed out`));
        }, timeout);
      }),
      new Promise<T>((resolve) => {
        this.requestResolutions.set(reqId, (m) => {
          clearTimeout(timeoutId); // clear the timeout
          resolve(m as T);
          this.requestResolutions.delete(reqId);
        });
      }),
    ]);
  }

  private async authenticate() {
    const msg = ClientMessageHostSession({
      id: IntNumber(this.nextReqId++),
      sessionId: this.session.id,
      sessionKey: this.session.key,
    });
    const res = await this.makeRequest<ServerMessageOK | ServerMessageFail>(msg);
    if (isServerMessageFail(res)) {
      throw new Error(res.error || 'failed to authentcate');
    }
  }

  private sendIsLinked(): void {
    const msg = ClientMessageIsLinked({
      id: IntNumber(this.nextReqId++),
      sessionId: this.session.id,
    });
    this.sendMessage(msg);
  }

  private sendGetSessionConfig(): void {
    const msg = ClientMessageGetSessionConfig({
      id: IntNumber(this.nextReqId++),
      sessionId: this.session.id,
    });
    this.sendMessage(msg);
  }

  private updateLastHeartbeat(): void {
    this.lastHeartbeatResponse = Date.now();
  }

  private heartbeat(): void {
    if (Date.now() - this.lastHeartbeatResponse > HEARTBEAT_INTERVAL * 2) {
      this.disconnect();
      return;
    }
    try {
      this.webSocket?.send('h');
    } catch {
      // noop
    }
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
