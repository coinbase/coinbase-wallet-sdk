// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { RelayMessage } from '../relay/RelayMessage';
import { Session } from '../relay/Session';
import { APP_VERSION_KEY, WALLET_USER_NAME_KEY } from '../relay/WalletSDKRelayAbstract';
import { isWeb3ResponseMessage, Web3ResponseMessage } from '../relay/Web3ResponseMessage';
import { ClientMessagePublishEvent, ClientMessageSetSessionConfig } from './ClientMessage';
import { DiagnosticLogger, EVENTS } from './DiagnosticLogger';
import {
  isServerMessageEvent,
  isServerMessageFail,
  ServerMessage,
  ServerMessageFail,
  ServerMessageGetSessionConfigOK,
  ServerMessageIsLinkedOK,
  ServerMessageLinked,
  ServerMessageOK,
  ServerMessagePublishEventOK,
  ServerMessageSessionConfigUpdated,
} from './ServerMessage';
import { SessionConfig } from './SessionConfig';
import { WalletLinkConnectionCipher } from './WalletLinkConnectionCipher';
import { WalletLinkHTTP } from './WalletLinkHTTP';
import { WalletLinkWebSocket, WalletLinkWebSocketUpdateListener } from './WalletLinkWebSocket';

export interface WalletLinkConnectionUpdateListener {
  linkedUpdated: (linked: boolean) => void;
  connectedUpdated: (connected: boolean) => void;
  handleWeb3ResponseMessage: (message: Web3ResponseMessage) => void;
  chainUpdated: (chainId: string, jsonRpcUrl: string) => void;
  accountUpdated: (selectedAddress: string) => void;
  metadataUpdated: (key: string, metadataValue: string) => void;
  resetAndReload: () => void;
}

interface WalletLinkConnectionParams {
  linkAPIUrl: string;
  session: Session;
  listener: WalletLinkConnectionUpdateListener;
  diagnostic?: DiagnosticLogger;
}

/**
 * Coinbase Wallet Connection
 */
export class WalletLinkConnection implements WalletLinkWebSocketUpdateListener {
  private readonly session: Session;
  private listener?: WalletLinkConnectionUpdateListener;
  private diagnostic?: DiagnosticLogger;
  private cipher: WalletLinkConnectionCipher;
  private ws: WalletLinkWebSocket;
  private http: WalletLinkHTTP;

  /**
   * Constructor
   * @param linkAPIUrl Coinbase Wallet link server URL
   * @param session Session
   * @param listener WalletLinkConnectionUpdateListener
   * @param [WebSocketClass] Custom WebSocket implementation
   */
  constructor({ session, linkAPIUrl, listener, diagnostic }: WalletLinkConnectionParams) {
    this.session = session;
    this.cipher = new WalletLinkConnectionCipher(session.secret);
    this.diagnostic = diagnostic;
    this.listener = listener;

    this.ws = new WalletLinkWebSocket({
      linkAPIUrl,
      session,
      listener: this,
    });

    this.http = new WalletLinkHTTP(linkAPIUrl, session.id, session.key);
  }
  websocketConnectedUpdated(connected: boolean): void {
    // distinctUntilChanged
    if (this.connected !== connected) {
      this.connected = connected;
    }
  }
  websocketMessageReceived = (m: ServerMessage) => {
    switch (m.type) {
      // handle server's heartbeat responses
      case 'Heartbeat':
        // this.updateLastHeartbeat();
        return;

      // handle link status updates
      case 'IsLinkedOK':
      case 'Linked': {
        const msg = m as Omit<ServerMessageIsLinkedOK, 'type'> & ServerMessageLinked;
        this.diagnostic?.log(EVENTS.LINKED, {
          sessionIdHash: Session.hash(this.session.id),
          linked: msg.linked,
          type: m.type,
          onlineGuests: msg.onlineGuests,
        });

        this.linked = msg.linked || msg.onlineGuests > 0;
        break;
      }

      // handle session config updates
      case 'GetSessionConfigOK':
      case 'SessionConfigUpdated': {
        const msg = m as Omit<ServerMessageGetSessionConfigOK, 'type'> &
          ServerMessageSessionConfigUpdated;
        this.diagnostic?.log(EVENTS.SESSION_CONFIG_RECEIVED, {
          sessionIdHash: Session.hash(this.session.id),
          metadata_keys: msg && msg.metadata ? Object.keys(msg.metadata) : undefined,
        });
        this.handleSessionMetadataUpdated(msg.metadata);
        break;
      }

      case 'Event': {
        this.handleIncomingEvent(m);
        break;
      }
    }
  };

  websocketConnected(): void {
    // check for unseen events
    if (this.shouldFetchUnseenEventsOnConnect) {
      this.fetchUnseenEventsAPI();
    }
  }

  /**
   * Make a connection to the server
   */
  public connect(): void {
    if (this.ws.isDestroyed) {
      throw new Error('instance is destroyed');
    }
    this.diagnostic?.log(EVENTS.STARTED_CONNECTING, {
      sessionIdHash: Session.hash(this.session.id),
    });
    this.ws.connect();
  }

  /**
   * Terminate connection, and mark as destroyed. To reconnect, create a new
   * instance of WalletSDKConnection
   */
  public destroy(): void {
    this.ws.disconnect();
    this.diagnostic?.log(EVENTS.DISCONNECTED, {
      sessionIdHash: Session.hash(this.session.id),
    });

    this.listener = undefined;
  }

  /**
   * true if connected and authenticated, else false
   * runs listener when connected status changes
   */
  private _connected = false;
  private get connected(): boolean {
    return this._connected;
  }
  private set connected(connected: boolean) {
    this._connected = connected;
    if (connected) this.onceConnected?.();
    this.listener?.connectedUpdated(connected);
  }

  /**
   * Execute once when connected
   */
  private onceConnected?: () => void;
  private setOnceConnected<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve) => {
      if (this.connected) {
        callback().then(resolve);
      } else {
        this.onceConnected = () => {
          callback().then(resolve);
          this.onceConnected = undefined;
        };
      }
    });
  }

  /**
   * true if linked (a guest has joined before)
   * runs listener when linked status changes
   */
  private _linked = false;
  private get linked(): boolean {
    return this._linked;
  }
  private set linked(linked: boolean) {
    this._linked = linked;
    if (linked) this.onceLinked?.();
    this.listener?.linkedUpdated(linked);
  }

  /**
   * Execute once when linked
   */
  private onceLinked?: () => void;
  private setOnceLinked<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve) => {
      if (this.linked) {
        callback().then(resolve);
      } else {
        this.onceLinked = () => {
          callback().then(resolve);
          this.onceLinked = undefined;
        };
      }
    });
  }

  private async handleIncomingEvent(m: ServerMessage) {
    if (!isServerMessageEvent(m) || m.event !== 'Web3Response') {
      return;
    }

    try {
      const decryptedData = await this.cipher.decrypt(m.data);
      const message = JSON.parse(decryptedData);

      if (!isWeb3ResponseMessage(message)) return;

      this.listener?.handleWeb3ResponseMessage(message);
    } catch {
      this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
        message: 'Had error decrypting',
        value: 'incomingEvent',
      });
    }
  }

  private shouldFetchUnseenEventsOnConnect = false;

  public async checkUnseenEvents() {
    if (!this.connected) {
      this.shouldFetchUnseenEventsOnConnect = true;
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      await this.fetchUnseenEventsAPI();
    } catch (e) {
      console.error('Unable to check for unseen events', e);
    }
  }

  private async fetchUnseenEventsAPI() {
    this.shouldFetchUnseenEventsOnConnect = false;

    const responseEvents = await this.http.fetchUnseenEvents();
    responseEvents.forEach((e) => this.handleIncomingEvent(e));
  }

  /**
   * Set session metadata in SessionConfig object
   * @param key
   * @param value
   * @returns a Promise that completes when successful
   */
  public async setSessionMetadata(key: string, value: string | null) {
    const message: Omit<ClientMessageSetSessionConfig, 'id'> = {
      sessionId: this.session.id,
      metadata: { [key]: value },
      type: 'SetSessionConfig',
    };

    return this.setOnceConnected(async () => {
      const res = await this.ws.makeRequest<ServerMessageOK | ServerMessageFail>(message);
      if (isServerMessageFail(res)) {
        throw new Error(res.error || 'failed to set session metadata');
      }
    });
  }

  /**
   * Publish an event and emit event ID when successful
   * @param event event name
   * @param unencryptedMessage unencrypted event message
   * @param callWebhook whether the webhook should be invoked
   * @returns a Promise that emits event ID when successful
   */
  public async publishEvent(event: string, unencryptedMessage: RelayMessage, callWebhook = false) {
    const data = await this.cipher.encrypt(
      JSON.stringify({
        ...unencryptedMessage,
        origin: location.origin,
        relaySource: window.coinbaseWalletExtension ? 'injected_sdk' : 'sdk',
      })
    );

    const message: Omit<ClientMessagePublishEvent, 'id'> = {
      sessionId: this.session.id,
      event,
      data,
      callWebhook,
      type: 'PublishEvent',
    };

    return this.setOnceLinked(async () => {
      const res = await this.ws.makeRequest<ServerMessagePublishEventOK | ServerMessageFail>(
        message
      );
      if (isServerMessageFail(res)) {
        throw new Error(res.error || 'failed to publish event');
      }
      return res.eventId;
    });
  }

  private handleSessionMetadataUpdated = (metadata: SessionConfig['metadata']) => {
    if (!metadata) return;

    // Map of metadata key to handler function
    const handlers = new Map<string, (value: string) => void>([
      ['__destroyed', this.handleDestroyed],
      ['EthereumAddress', this.handleAccountUpdated],
      ['WalletUsername', this.handleWalletUsernameUpdated],
      ['AppVersion', this.handleAppVersionUpdated],
      [
        'ChainId', // ChainId and JsonRpcUrl are always updated together
        (v: string) => metadata.JsonRpcUrl && this.handleChainUpdated(v, metadata.JsonRpcUrl),
      ],
    ]);

    // call handler for each metadata key if value is defined
    handlers.forEach((handler, key) => {
      const value = metadata[key];
      if (value === undefined) return;
      handler(value);
    });
  };

  private handleDestroyed = (__destroyed: string) => {
    if (__destroyed !== '1') return;

    this.listener?.resetAndReload();
    this.diagnostic?.log(EVENTS.METADATA_DESTROYED, {
      alreadyDestroyed: this.ws.isDestroyed,
      sessionIdHash: Session.hash(this.session.id),
    });
  };

  private handleAccountUpdated = async (encryptedEthereumAddress: string) => {
    try {
      const address = await this.cipher.decrypt(encryptedEthereumAddress);
      this.listener?.accountUpdated(address);
    } catch {
      this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
        message: 'Had error decrypting',
        value: 'selectedAddress',
      });
    }
  };

  private handleMetadataUpdated = async (key: string, encryptedMetadataValue: string) => {
    try {
      const decryptedValue = await this.cipher.decrypt(encryptedMetadataValue);
      this.listener?.metadataUpdated(key, decryptedValue);
    } catch {
      this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
        message: 'Had error decrypting',
        value: key,
      });
    }
  };

  private handleWalletUsernameUpdated = async (walletUsername: string) => {
    this.handleMetadataUpdated(WALLET_USER_NAME_KEY, walletUsername);
  };

  private handleAppVersionUpdated = async (appVersion: string) => {
    this.handleMetadataUpdated(APP_VERSION_KEY, appVersion);
  };

  private handleChainUpdated = async (encryptedChainId: string, encryptedJsonRpcUrl: string) => {
    try {
      const chainId = await this.cipher.decrypt(encryptedChainId);
      const jsonRpcUrl = await this.cipher.decrypt(encryptedJsonRpcUrl);
      this.listener?.chainUpdated(chainId, jsonRpcUrl);
    } catch {
      this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
        message: 'Had error decrypting',
        value: 'chainId|jsonRpcUrl',
      });
    }
  };
}
