// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { ErrorType, getMessageFromCode, standardErrors } from '../../core/error';
import { AddressString, IntNumber, RegExpString } from '../../core/type';
import {
  bigIntStringFromBN,
  createQrUrl,
  hexStringFromBuffer,
  randomBytesHex,
} from '../../core/util';
import { ScopedLocalStorage } from '../../lib/ScopedLocalStorage';
import { DiagnosticLogger, EVENTS } from '../../provider/DiagnosticLogger';
import { CancelablePromise, LOCAL_STORAGE_ADDRESSES_KEY, RelayAbstract } from '../RelayAbstract';
import { RelayEventManager } from '../RelayEventManager';
import { RelayUI, RelayUIOptions } from '../RelayUI';
import {
  WalletLinkConnection,
  WalletLinkConnectionUpdateListener,
} from './connection/WalletLinkConnection';
import { EthereumTransactionParams } from './type/EthereumTransactionParams';
import { WalletLinkEventData, WalletLinkResponseEventData } from './type/WalletLinkEventData';
import { WalletLinkSession } from './type/WalletLinkSession';
import { Web3Method } from './type/Web3Method';
import { SupportedWeb3Method, Web3Request } from './type/Web3Request';
import { isErrorResponse, Web3Response } from './type/Web3Response';

export interface WalletLinkRelayOptions {
  linkAPIUrl: string;
  version: string;
  darkMode: boolean;
  storage: ScopedLocalStorage;
  uiConstructor: (options: Readonly<RelayUIOptions>) => RelayUI;
  diagnosticLogger?: DiagnosticLogger;
  reloadOnDisconnect?: boolean;
}

export class WalletLinkRelay extends RelayAbstract implements WalletLinkConnectionUpdateListener {
  private static accountRequestCallbackIds = new Set<string>();

  private readonly linkAPIUrl: string;
  protected readonly storage: ScopedLocalStorage;
  private _session: WalletLinkSession;
  private readonly relayEventManager: RelayEventManager;
  protected readonly diagnostic?: DiagnosticLogger;
  protected connection: WalletLinkConnection;
  private accountsCallback: ((account: string[], isDisconnect?: boolean) => void) | null = null;
  private chainCallbackParams = { chainId: '', jsonRpcUrl: '' }; // to implement distinctUntilChanged
  private chainCallback: ((chainId: string, jsonRpcUrl: string) => void) | null = null;
  protected dappDefaultChain = 1;
  private readonly options: WalletLinkRelayOptions;

  protected ui: RelayUI;

  protected appName = '';
  protected appLogoUrl: string | null = null;
  private _reloadOnDisconnect: boolean;
  isLinked: boolean | undefined;
  isUnlinkedErrorState: boolean | undefined;

  constructor(options: Readonly<WalletLinkRelayOptions>) {
    super();
    this.resetAndReload = this.resetAndReload.bind(this);

    this.linkAPIUrl = options.linkAPIUrl;
    this.storage = options.storage;
    this.options = options;

    const { session, ui, connection } = this.subscribe();

    this._session = session;
    this.connection = connection;

    this.relayEventManager = new RelayEventManager();

    this.diagnostic = options.diagnosticLogger;

    this._reloadOnDisconnect = options.reloadOnDisconnect ?? true;

    this.ui = ui;
  }

  public subscribe() {
    const session =
      WalletLinkSession.load(this.storage) || new WalletLinkSession(this.storage).save();

    const { linkAPIUrl, diagnostic } = this;
    const connection = new WalletLinkConnection({
      session,
      linkAPIUrl,
      diagnostic,
      listener: this,
    });

    const { version, darkMode } = this.options;
    const ui = this.options.uiConstructor({
      linkAPIUrl,
      version,
      darkMode,
    });

    connection.connect();

    return { session, ui, connection };
  }

  linkedUpdated = (linked: boolean) => {
    this.isLinked = linked;
    const cachedAddresses = this.storage.getItem(LOCAL_STORAGE_ADDRESSES_KEY);

    if (linked) {
      // Only set linked session variable one way
      this.session.linked = linked;
    }

    this.isUnlinkedErrorState = false;

    if (cachedAddresses) {
      const addresses = cachedAddresses.split(' ') as AddressString[];
      const wasConnectedViaStandalone = this.storage.getItem('IsStandaloneSigning') === 'true';
      if (addresses[0] !== '' && !linked && this.session.linked && !wasConnectedViaStandalone) {
        this.isUnlinkedErrorState = true;
        const sessionIdHash = this.getSessionIdHash();
        this.diagnostic?.log(EVENTS.UNLINKED_ERROR_STATE, {
          sessionIdHash,
        });
      }
    }
  };

  metadataUpdated = (key: string, value: string) => {
    this.storage.setItem(key, value);
  };

  chainUpdated = (chainId: string, jsonRpcUrl: string) => {
    if (
      this.chainCallbackParams.chainId === chainId &&
      this.chainCallbackParams.jsonRpcUrl === jsonRpcUrl
    ) {
      return;
    }
    this.chainCallbackParams = {
      chainId,
      jsonRpcUrl,
    };

    if (this.chainCallback) {
      this.chainCallback(chainId, jsonRpcUrl);
    }
  };

  accountUpdated = (selectedAddress: string) => {
    if (this.accountsCallback) {
      this.accountsCallback([selectedAddress]);
    }
    if (WalletLinkRelay.accountRequestCallbackIds.size > 0) {
      // We get the ethereum address from the metadata.  If for whatever
      // reason we don't get a response via an explicit web3 message
      // we can still fulfill the eip1102 request.
      Array.from(WalletLinkRelay.accountRequestCallbackIds.values()).forEach((id) => {
        const message: WalletLinkEventData = {
          type: 'WEB3_RESPONSE',
          id,
          response: {
            method: 'requestEthereumAccounts',
            result: [selectedAddress as AddressString],
          },
        };
        this.invokeCallback({ ...message, id });
      });
      WalletLinkRelay.accountRequestCallbackIds.clear();
    }
  };

  public attachUI() {
    this.ui.attach();
  }

  public resetAndReload(): void {
    Promise.race([
      this.connection.setSessionMetadata('__destroyed', '1'),
      new Promise((resolve) => setTimeout(() => resolve(null), 1000)),
    ])
      .then(() => {
        this.diagnostic?.log(EVENTS.SESSION_STATE_CHANGE, {
          method: 'relay::resetAndReload',
          sessionMetadataChange: '__destroyed, 1',
          sessionIdHash: this.getSessionIdHash(),
        });
        this.connection.destroy();
        /**
         * Only clear storage if the session id we have in memory matches the one on disk
         * Otherwise, in the case where we have 2 tabs, another tab might have cleared
         * storage already.  In that case if we clear storage again, the user will be in
         * a state where the first tab allows the user to connect but the session that
         * was used isn't persisted.  This leaves the user in a state where they aren't
         * connected to the mobile app.
         */
        const storedSession = WalletLinkSession.load(this.storage);
        if (storedSession?.id === this._session.id) {
          this.storage.clear();
        } else if (storedSession) {
          this.diagnostic?.log(EVENTS.SKIPPED_CLEARING_SESSION, {
            sessionIdHash: this.getSessionIdHash(),
            storedSessionIdHash: WalletLinkSession.hash(storedSession.id),
          });
        }

        if (this._reloadOnDisconnect) {
          this.ui.reloadUI();
          return;
        }

        if (this.accountsCallback) {
          this.accountsCallback([], true);
        }

        const { session, ui, connection } = this.subscribe();
        this._session = session;
        this.connection = connection;
        this.ui = ui;

        this.attachUI();
      })
      .catch((err: string) => {
        this.diagnostic?.log(EVENTS.FAILURE, {
          method: 'relay::resetAndReload',
          message: `failed to reset and reload with ${err}`,
          sessionIdHash: this.getSessionIdHash(),
        });
      });
  }

  public setAppInfo(appName: string, appLogoUrl: string | null): void {
    this.appName = appName;
    this.appLogoUrl = appLogoUrl;
  }

  public getStorageItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  public get session(): WalletLinkSession {
    return this._session;
  }

  public setStorageItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  public signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean,
    typedDataJson?: string | null
  ) {
    return this.sendRequest({
      method: 'signEthereumMessage',
      params: {
        message: hexStringFromBuffer(message, true),
        address,
        addPrefix,
        typedDataJson: typedDataJson || null,
      },
    });
  }

  public ethereumAddressFromSignedMessage(message: Buffer, signature: Buffer, addPrefix: boolean) {
    return this.sendRequest({
      method: 'ethereumAddressFromSignedMessage',
      params: {
        message: hexStringFromBuffer(message, true),
        signature: hexStringFromBuffer(signature, true),
        addPrefix,
      },
    });
  }

  public signEthereumTransaction(params: EthereumTransactionParams) {
    return this.sendRequest({
      method: 'signEthereumTransaction',
      params: {
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        weiValue: bigIntStringFromBN(params.weiValue),
        data: hexStringFromBuffer(params.data, true),
        nonce: params.nonce,
        gasPriceInWei: params.gasPriceInWei ? bigIntStringFromBN(params.gasPriceInWei) : null,
        maxFeePerGas: params.gasPriceInWei ? bigIntStringFromBN(params.gasPriceInWei) : null,
        maxPriorityFeePerGas: params.gasPriceInWei
          ? bigIntStringFromBN(params.gasPriceInWei)
          : null,
        gasLimit: params.gasLimit ? bigIntStringFromBN(params.gasLimit) : null,
        chainId: params.chainId,
        shouldSubmit: false,
      },
    });
  }

  public signAndSubmitEthereumTransaction(params: EthereumTransactionParams) {
    return this.sendRequest<'signEthereumTransaction', 'submitEthereumTransaction'>({
      method: 'signEthereumTransaction',
      params: {
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        weiValue: bigIntStringFromBN(params.weiValue),
        data: hexStringFromBuffer(params.data, true),
        nonce: params.nonce,
        gasPriceInWei: params.gasPriceInWei ? bigIntStringFromBN(params.gasPriceInWei) : null,
        maxFeePerGas: params.maxFeePerGas ? bigIntStringFromBN(params.maxFeePerGas) : null,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas
          ? bigIntStringFromBN(params.maxPriorityFeePerGas)
          : null,
        gasLimit: params.gasLimit ? bigIntStringFromBN(params.gasLimit) : null,
        chainId: params.chainId,
        shouldSubmit: true,
      },
    });
  }

  public submitEthereumTransaction(signedTransaction: Buffer, chainId: IntNumber) {
    return this.sendRequest({
      method: 'submitEthereumTransaction',
      params: {
        signedTransaction: hexStringFromBuffer(signedTransaction, true),
        chainId,
      },
    });
  }

  public scanQRCode(regExp: RegExpString) {
    return this.sendRequest({
      method: 'scanQRCode',
      params: {
        regExp,
      },
    });
  }

  public getQRCodeUrl() {
    return createQrUrl(
      this._session.id,
      this._session.secret,
      this.linkAPIUrl,
      false,
      this.options.version,
      this.dappDefaultChain
    );
  }

  public genericRequest(data: object, action: string) {
    return this.sendRequest({
      method: 'generic',
      params: {
        action,
        data,
      },
    });
  }

  public sendGenericMessage(
    request: Web3Request<'generic'>
  ): CancelablePromise<Web3Response<'generic'>> {
    return this.sendRequest(request);
  }

  public sendRequest<
    RequestMethod extends SupportedWeb3Method,
    ResponseMethod extends SupportedWeb3Method = RequestMethod,
    Response = Web3Response<ResponseMethod>,
  >(request: Web3Request<RequestMethod>): CancelablePromise<Response> {
    let hideSnackbarItem: (() => void) | null = null;
    const id = randomBytesHex(8);

    const cancel = (error?: ErrorType) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
      hideSnackbarItem?.();
    };

    const promise = new Promise<Response>((resolve, reject) => {
      {
        hideSnackbarItem = this.ui.showConnecting({
          isUnlinkedErrorState: this.isUnlinkedErrorState,
          onCancel: cancel,
          onResetConnection: this.resetAndReload, // eslint-disable-line @typescript-eslint/unbound-method
        });
      }

      this.relayEventManager.callbacks.set(id, (response) => {
        hideSnackbarItem?.();
        if (isErrorResponse(response)) {
          return reject(new Error(response.errorMessage));
        }

        resolve(response as Response);
      });

      this.publishWeb3RequestEvent(id, request);
    });

    return { promise, cancel };
  }

  public setAccountsCallback(
    accountsCallback: (accounts: string[], isDisconnect?: boolean) => void
  ) {
    this.accountsCallback = accountsCallback;
  }

  public setChainCallback(chainCallback: (chainId: string, jsonRpcUrl: string) => void) {
    this.chainCallback = chainCallback;
  }

  public setDappDefaultChainCallback(chainId: number) {
    this.dappDefaultChain = chainId;
  }

  protected publishWeb3RequestEvent(id: string, request: Web3Request): void {
    const message: WalletLinkEventData = { type: 'WEB3_REQUEST', id, request };
    const storedSession = WalletLinkSession.load(this.storage);
    this.diagnostic?.log(EVENTS.WEB3_REQUEST, {
      eventId: message.id,
      method: `relay::${request.method}`,
      sessionIdHash: this.getSessionIdHash(),
      storedSessionIdHash: storedSession ? WalletLinkSession.hash(storedSession.id) : '',
      isSessionMismatched: (storedSession?.id !== this._session.id).toString(),
    });

    this.publishEvent('Web3Request', message, true)
      .then((_) => {
        this.diagnostic?.log(EVENTS.WEB3_REQUEST_PUBLISHED, {
          eventId: message.id,
          method: `relay::${request.method}`,
          sessionIdHash: this.getSessionIdHash(),
          storedSessionIdHash: storedSession ? WalletLinkSession.hash(storedSession.id) : '',
          isSessionMismatched: (storedSession?.id !== this._session.id).toString(),
        });
      })
      .catch((err) => {
        this.handleWeb3ResponseMessage({
          type: 'WEB3_RESPONSE',
          id: message.id,
          response: {
            method: request.method,
            errorMessage: err.message,
          },
        });
      });
  }

  private publishWeb3RequestCanceledEvent(id: string) {
    const message: WalletLinkEventData = {
      type: 'WEB3_REQUEST_CANCELED',
      id,
    };
    this.publishEvent('Web3RequestCanceled', message, false).then();
  }

  protected publishEvent(
    event: string,
    message: WalletLinkEventData,
    callWebhook: boolean
  ): Promise<string> {
    return this.connection.publishEvent(event, message, callWebhook);
  }

  handleWeb3ResponseMessage(message: WalletLinkResponseEventData) {
    const { response } = message;

    this.diagnostic?.log(EVENTS.WEB3_RESPONSE, {
      eventId: message.id,
      method: `relay::${response.method}`,
      sessionIdHash: this.getSessionIdHash(),
    });
    if (response.method === 'requestEthereumAccounts') {
      WalletLinkRelay.accountRequestCallbackIds.forEach((id) =>
        this.invokeCallback({ ...message, id })
      );
      WalletLinkRelay.accountRequestCallbackIds.clear();
      return;
    }

    this.invokeCallback(message);
  }

  private handleErrorResponse(
    id: string,
    method: Web3Method,
    error?: ErrorType,
    errorCode?: number
  ) {
    const errorMessage = error?.message ?? getMessageFromCode(errorCode);
    this.handleWeb3ResponseMessage({
      type: 'WEB3_RESPONSE',
      id,
      response: {
        method,
        errorMessage,
        errorCode,
      },
    });
  }

  private invokeCallback(message: WalletLinkResponseEventData) {
    const callback = this.relayEventManager.callbacks.get(message.id);
    if (callback) {
      callback(message.response);
      this.relayEventManager.callbacks.delete(message.id);
    }
  }

  public requestEthereumAccounts() {
    const request: Web3Request = {
      method: 'requestEthereumAccounts',
      params: {
        appName: this.appName,
        appLogoUrl: this.appLogoUrl || null,
      },
    };

    const hideSnackbarItem: (() => void) | null = null;
    const id = randomBytesHex(8);

    const cancel = (error?: ErrorType) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      hideSnackbarItem?.();
    };

    const promise = new Promise<Web3Response<'requestEthereumAccounts'>>((resolve, reject) => {
      this.relayEventManager.callbacks.set(id, (response) => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        hideSnackbarItem?.();
        if (isErrorResponse(response)) {
          return reject(new Error(response.errorMessage));
        }
        resolve(response as Web3Response<'requestEthereumAccounts'>);
      });
      WalletLinkRelay.accountRequestCallbackIds.add(id);
      this.publishWeb3RequestEvent(id, request);
    });

    return { promise, cancel };
  }

  watchAsset(
    type: string,
    address: string,
    symbol?: string,
    decimals?: number,
    image?: string,
    chainId?: string
  ): CancelablePromise<Web3Response<'watchAsset'>> {
    const request: Web3Request = {
      method: 'watchAsset',
      params: {
        type,
        options: {
          address,
          symbol,
          decimals,
          image,
        },
        chainId,
      },
    };

    let hideSnackbarItem: (() => void) | null = null;
    const id = randomBytesHex(8);

    const cancel = (error?: ErrorType) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
      hideSnackbarItem?.();
    };

    {
      hideSnackbarItem = this.ui.showConnecting({
        isUnlinkedErrorState: this.isUnlinkedErrorState,
        onCancel: cancel,
        onResetConnection: this.resetAndReload, // eslint-disable-line @typescript-eslint/unbound-method
      });
    }

    const promise = new Promise<Web3Response<'watchAsset'>>((resolve, reject) => {
      this.relayEventManager.callbacks.set(id, (response) => {
        hideSnackbarItem?.();

        if (isErrorResponse(response)) {
          return reject(new Error(response.errorMessage));
        }
        resolve(response as Web3Response<'watchAsset'>);
      });

      this.publishWeb3RequestEvent(id, request);
    });

    return { cancel, promise };
  }

  addEthereumChain(
    chainId: string,
    rpcUrls: string[],
    iconUrls: string[],
    blockExplorerUrls: string[],
    chainName?: string,
    nativeCurrency?: {
      name: string;
      symbol: string;
      decimals: number;
    }
  ) {
    const request: Web3Request = {
      method: 'addEthereumChain',
      params: {
        chainId,
        rpcUrls,
        blockExplorerUrls,
        chainName,
        iconUrls,
        nativeCurrency,
      },
    };

    let hideSnackbarItem: (() => void) | null = null;
    const id = randomBytesHex(8);

    const cancel = (error?: ErrorType) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
      hideSnackbarItem?.();
    };

    {
      hideSnackbarItem = this.ui.showConnecting({
        isUnlinkedErrorState: this.isUnlinkedErrorState,
        onCancel: cancel,
        onResetConnection: this.resetAndReload, // eslint-disable-line @typescript-eslint/unbound-method
      });
    }

    const promise = new Promise<Web3Response<'addEthereumChain'>>((resolve, reject) => {
      this.relayEventManager.callbacks.set(id, (response) => {
        hideSnackbarItem?.();

        if (isErrorResponse(response)) {
          return reject(new Error(response.errorMessage));
        }
        resolve(response as Web3Response<'addEthereumChain'>);
      });

      this.publishWeb3RequestEvent(id, request);
    });

    return { promise, cancel };
  }

  switchEthereumChain(
    chainId: string,
    address?: string
  ): CancelablePromise<Web3Response<'switchEthereumChain'>> {
    const request: Web3Request = {
      method: 'switchEthereumChain',
      params: {
        chainId,
        ...{ address },
      },
    };

    const id = randomBytesHex(8);

    const cancel = (error?: ErrorType) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
    };

    const promise = new Promise<Web3Response<'switchEthereumChain'>>((resolve, reject) => {
      this.relayEventManager.callbacks.set(id, (response) => {
        if (isErrorResponse(response) && response.errorCode) {
          return reject(
            standardErrors.provider.custom({
              code: response.errorCode,
              message: `Unrecognized chain ID. Try adding the chain using addEthereumChain first.`,
            })
          );
        } else if (isErrorResponse(response)) {
          return reject(new Error(response.errorMessage));
        }

        resolve(response as Web3Response<'switchEthereumChain'>);
      });

      this.publishWeb3RequestEvent(id, request);
    });

    return { promise, cancel };
  }

  private getSessionIdHash(): string {
    return WalletLinkSession.hash(this._session.id);
  }
}
