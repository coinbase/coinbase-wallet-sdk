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
  ServerMessageIsLinkedOK,
  ServerMessageOK,
} from './ServerMessage';
import { SessionConfig } from './SessionConfig';
import { WalletLinkConnectionCipher } from './WalletLinkConnectionCipher';
import { WalletLinkHTTP } from './WalletLinkHTTP';
import {
  ConnectionState,
  WalletLinkWebSocket,
  WalletLinkWebSocketUpdateListener,
} from './WalletLinkWebSocket';

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
  session: Session;
  linkAPIUrl: string;
  listener: WalletLinkConnectionUpdateListener;
  diagnostic?: DiagnosticLogger;
  WebSocketClass?: typeof WebSocket;
}

/**
 * Coinbase Wallet Connection
 */
export class WalletLinkConnection implements WalletLinkWebSocketUpdateListener {
  private destroyed = false;

  private readonly session: Session;
  private listener?: WalletLinkConnectionUpdateListener;
  private diagnostic?: DiagnosticLogger;
  private cipher: WalletLinkConnectionCipher;
  private ws: WalletLinkWebSocket;
  private http: WalletLinkHTTP;

  /**
   * Constructor
   * @param session Session
   * @param linkAPIUrl Coinbase Wallet link server URL
   * @param listener WalletLinkConnectionUpdateListener
   * @param [WebSocketClass] Custom WebSocket implementation
   */
  constructor({
    session,
    linkAPIUrl,
    listener,
    diagnostic,
    WebSocketClass = WebSocket,
  }: WalletLinkConnectionParams) {
    this.session = session;
    this.cipher = new WalletLinkConnectionCipher(session.secret);
    this.diagnostic = diagnostic;
    this.listener = listener;

    this.ws = new WalletLinkWebSocket({
      linkAPIUrl,
      session,
      WebSocketClass,
      listener: this,
    });

    this.http = new WalletLinkHTTP(linkAPIUrl, session.id, session.key);
  }

  /**
   * @param state ConnectionState;
   * ConnectionState.CONNECTING is used for logging only
   * TODO:
   *  Revisit if the logging is necessary.
   *  If not, deprecate the enum and use boolean instead.
   */
  websocketConnectionStateUpdated = (state: ConnectionState) => {
    this.diagnostic?.log(EVENTS.CONNECTED_STATE_CHANGE, {
      state,
      sessionIdHash: Session.hash(this.session.id),
    });

    switch (state) {
      case ConnectionState.DISCONNECTED:
        if (this.destroyed) return;
        this.reconnect();
        break;
      case ConnectionState.CONNECTED:
        this.websocketConnected();
        break;
      case ConnectionState.CONNECTING:
        break;
    }
  };

  /**
   * This section of code implements a reconnect behavior that was ported from a legacy system.
   * Preserving original comments to maintain the rationale and context provided by the original author.
   * https://github.com/coinbase/coinbase-wallet-sdk/commit/2087ee4a7d40936cd965011bfacdb76ce3462894#diff-dd71e86752e2c20c0620eb0ba4c4b21674e55ae8afeb005b82906a3821e5023cR84
   * TOOD: revisit this logic to assess its validity in the current system context.
   */
  private reconnect = async () => {
    // wait 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));
    // check whether it's destroyed again
    if (!this.destroyed) {
      // reconnect
      this.ws.connect().catch(() => {
        this.reconnect();
      });
    }
  };

  private websocketConnected(): void {
    // check for unseen events
    if (this.shouldFetchUnseenEventsOnConnect) {
      this.fetchUnseenEventsAPI();
    }

    // distinctUntilChanged
    if (this.connected !== true) {
      this.connected = true;
    }
  }

  /**
   * @param msg Partial<ServerMessageIsLinkedOK>
   * Only for logging
   *  TODO: Revisit if this is necessary
   */
  websocketLinkedUpdated = (linked: boolean, msg: Partial<ServerMessageIsLinkedOK>) => {
    this.diagnostic?.log(EVENTS.LINKED, {
      sessionIdHash: Session.hash(this.session.id),
      linked: msg.linked,
      type: msg.type,
      onlineGuests: msg.onlineGuests,
    });

    this.listener?.linkedUpdated(linked);
  };

  websocketServerMessageReceived = (m: ServerMessage) => {
    switch (m.type) {
      case 'Event': {
        this.handleIncomingEvent(m);
        break;
      }
    }

    // // resolve request promises
    // if (m.id !== undefined) {
    //   this.requestResolutions.get(m.id)?.(m);
    // }
  };

  /**
   * Make a connection to the server
   */
  public connect(): void {
    if (this.destroyed) {
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
    this.destroyed = true;

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

    // this.setOnceLinked(async () => {
    //   const res = await this.ws.makeRequest<ServerMessagePublishEventOK | ServerMessageFail>(
    //     message
    //   );
    //   if (isServerMessageFail(res)) {
    //     throw new Error(res.error || 'failed to publish event');
    //   }
    //   return res.eventId;
    // });

    return this.ws.makeRequestOnceConnected(message);
  }

  websocketSessionMetadataUpdated = (metadata: SessionConfig['metadata']) => {
    this.diagnostic?.log(EVENTS.SESSION_CONFIG_RECEIVED, {
      sessionIdHash: Session.hash(this.session.id),
      metadata_keys: metadata ? Object.keys(metadata) : undefined,
    });

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
      alreadyDestroyed: this.destroyed,
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
