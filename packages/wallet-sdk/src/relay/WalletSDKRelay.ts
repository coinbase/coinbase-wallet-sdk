// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import bind from "bind-decorator";
import { ethErrors } from "eth-rpc-errors";
import { BehaviorSubject, Observable, of, Subscription, zip } from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  skip,
  tap,
  timeout,
} from "rxjs/operators";

import { DiagnosticLogger, EVENTS } from "../connection/DiagnosticLogger";
import { EventListener } from "../connection/EventListener";
import { ServerMessageEvent } from "../connection/ServerMessage";
import { SessionConfig } from "../connection/SessionConfig";
import { WalletSDKConnection } from "../connection/WalletSDKConnection";
import { ScopedLocalStorage } from "../lib/ScopedLocalStorage";
import { WalletUI, WalletUIOptions } from "../provider/WalletUI";
import { WalletUIError } from "../provider/WalletUIError";
import { AddressString, IntNumber, ProviderType, RegExpString } from "../types";
import {
  bigIntStringFromBN,
  createQrUrl,
  hexStringFromBuffer,
  isInIFrame,
  randomBytesHex,
} from "../util";
import * as aes256gcm from "./aes256gcm";
import { EthereumTransactionParams } from "./EthereumTransactionParams";
import { RelayMessage } from "./RelayMessage";
import { Session } from "./Session";
import {
  APP_VERSION_KEY,
  CancelablePromise,
  LOCAL_STORAGE_ADDRESSES_KEY,
  WALLET_USER_NAME_KEY,
  WalletSDKRelayAbstract,
} from "./WalletSDKRelayAbstract";
import { WalletSDKRelayEventManager } from "./WalletSDKRelayEventManager";
import { Web3Method } from "./Web3Method";
import {
  EthereumAddressFromSignedMessageRequest,
  GenericRequest,
  ScanQRCodeRequest,
  SignEthereumMessageRequest,
  SignEthereumTransactionRequest,
  SubmitEthereumTransactionRequest,
  Web3Request,
} from "./Web3Request";
import { Web3RequestCanceledMessage } from "./Web3RequestCanceledMessage";
import { Web3RequestMessage } from "./Web3RequestMessage";
import {
  AddEthereumChainResponse,
  ErrorResponse,
  EthereumAddressFromSignedMessageResponse,
  GenericResponse,
  isRequestEthereumAccountsResponse,
  RequestEthereumAccountsResponse,
  ScanQRCodeResponse,
  SelectProviderResponse,
  SignEthereumMessageResponse,
  SignEthereumTransactionResponse,
  SubmitEthereumTransactionResponse,
  SwitchEthereumChainResponse,
  WatchAssetReponse,
  WatchAssetResponse,
  Web3Response,
} from "./Web3Response";
import {
  isWeb3ResponseMessage,
  Web3ResponseMessage,
} from "./Web3ResponseMessage";

export interface WalletSDKRelayOptions {
  linkAPIUrl: string;
  version: string;
  darkMode: boolean;
  storage: ScopedLocalStorage;
  relayEventManager: WalletSDKRelayEventManager;
  uiConstructor: (options: Readonly<WalletUIOptions>) => WalletUI;
  diagnosticLogger?: DiagnosticLogger;
  eventListener?: EventListener;
  reloadOnDisconnect?: boolean;
}

export class WalletSDKRelay extends WalletSDKRelayAbstract {
  private static accountRequestCallbackIds = new Set<string>();

  private readonly linkAPIUrl: string;
  protected readonly storage: ScopedLocalStorage;
  private _session: Session;
  private readonly relayEventManager: WalletSDKRelayEventManager;
  protected readonly diagnostic?: DiagnosticLogger;
  private connection: WalletSDKConnection;
  private accountsCallback:
    | ((account: string[], isDisconnect?: boolean) => void)
    | null = null;
  private chainCallback:
    | ((chainId: string, jsonRpcUrl: string) => void)
    | null = null;
  private dappDefaultChainSubject = new BehaviorSubject(1);
  private dappDefaultChain = 1;
  private readonly options: WalletSDKRelayOptions;

  private ui: WalletUI;

  private appName = "";
  private appLogoUrl: string | null = null;
  private subscriptions = new Subscription();
  private _reloadOnDisconnect: boolean;
  isLinked: boolean | undefined;
  isUnlinkedErrorState: boolean | undefined;

  constructor(options: Readonly<WalletSDKRelayOptions>) {
    super();
    this.linkAPIUrl = options.linkAPIUrl;
    this.storage = options.storage;
    this.options = options;

    const { session, ui, connection } = this.subscribe();

    this._session = session;
    this.connection = connection;

    this.relayEventManager = options.relayEventManager;

    if (options.diagnosticLogger && options.eventListener) {
      throw new Error(
        "Can't have both eventListener and diagnosticLogger options, use only diagnosticLogger",
      );
    }

    if (options.eventListener) {
      this.diagnostic = {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        log: options.eventListener.onEvent,
      };
    } else {
      this.diagnostic = options.diagnosticLogger;
    }

    this._reloadOnDisconnect = options.reloadOnDisconnect ?? true;

    this.ui = ui;
  }

  public subscribe() {
    this.subscriptions.add(
      this.dappDefaultChainSubject.subscribe(chainId => {
        if (this.dappDefaultChain !== chainId) {
          this.dappDefaultChain = chainId;
        }
      }),
    );

    const session =
      Session.load(this.storage) || new Session(this.storage).save();

    const connection = new WalletSDKConnection(
      session.id,
      session.key,
      this.linkAPIUrl,
      this.diagnostic,
    );

    this.subscriptions.add(
      connection.sessionConfig$.subscribe({
        next: sessionConfig => {
          this.onSessionConfigChanged(sessionConfig);
        },
        error: () => {
          this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
            message: "error while invoking session config callback",
          });
        },
      }),
    );

    this.subscriptions.add(
      connection.incomingEvent$
        .pipe(filter(m => m.event === "Web3Response"))
        .subscribe({ next: this.handleIncomingEvent }), // eslint-disable-line @typescript-eslint/unbound-method
    );

    this.subscriptions.add(
      connection.linked$
        .pipe(
          skip(1),
          tap((linked: boolean) => {
            this.isLinked = linked;
            const cachedAddresses = this.storage.getItem(
              LOCAL_STORAGE_ADDRESSES_KEY,
            );

            if (linked) {
              // Only set linked session variable one way
              this.session.linked = linked;
            }

            this.isUnlinkedErrorState = false;

            if (cachedAddresses) {
              const addresses = cachedAddresses.split(" ") as AddressString[];
              const wasConnectedViaStandalone =
                this.storage.getItem("IsStandaloneSigning") === "true";
              if (
                addresses[0] !== "" &&
                !linked &&
                this.session.linked &&
                !wasConnectedViaStandalone
              ) {
                this.isUnlinkedErrorState = true;
                const sessionIdHash = this.getSessionIdHash();
                this.diagnostic?.log(EVENTS.UNLINKED_ERROR_STATE, {
                  sessionIdHash,
                });
              }
            }
          }),
        )
        .subscribe(),
    );

    // if session is marked destroyed, reset and reload
    this.subscriptions.add(
      connection.sessionConfig$
        .pipe(filter(c => !!c.metadata && c.metadata.__destroyed === "1"))
        .subscribe(() => {
          const alreadyDestroyed = connection.isDestroyed;
          this.diagnostic?.log(EVENTS.METADATA_DESTROYED, {
            alreadyDestroyed,
            sessionIdHash: this.getSessionIdHash(),
          });
          return this.resetAndReload();
        }),
    );

    this.subscriptions.add(
      connection.sessionConfig$
        .pipe(
          filter(c => c.metadata && c.metadata.WalletUsername !== undefined),
        )
        .pipe(
          mergeMap(c =>
            aes256gcm.decrypt(c.metadata.WalletUsername!, session.secret),
          ),
        )
        .subscribe({
          next: walletUsername => {
            this.storage.setItem(WALLET_USER_NAME_KEY, walletUsername);
          },
          error: () => {
            this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
              message: "Had error decrypting",
              value: "username",
            });
          },
        }),
    );

    this.subscriptions.add(
      connection.sessionConfig$
        .pipe(filter(c => c.metadata && c.metadata.AppVersion !== undefined))
        .pipe(
          mergeMap(c =>
            aes256gcm.decrypt(c.metadata.AppVersion!, session.secret),
          ),
        )
        .subscribe({
          next: appVersion => {
            this.storage.setItem(APP_VERSION_KEY, appVersion);
          },
          error: () => {
            this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
              message: "Had error decrypting",
              value: "appversion",
            });
          },
        }),
    );

    this.subscriptions.add(
      connection.sessionConfig$
        .pipe(
          filter(
            c =>
              c.metadata &&
              c.metadata.ChainId !== undefined &&
              c.metadata.JsonRpcUrl !== undefined,
          ),
        )
        .pipe(
          mergeMap(c =>
            zip(
              aes256gcm.decrypt(c.metadata.ChainId!, session.secret),
              aes256gcm.decrypt(c.metadata.JsonRpcUrl!, session.secret),
            ),
          ),
        )
        .pipe(distinctUntilChanged())
        .subscribe({
          next: ([chainId, jsonRpcUrl]) => {
            if (this.chainCallback) {
              this.chainCallback(chainId, jsonRpcUrl);
            }
          },
          error: () => {
            this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
              message: "Had error decrypting",
              value: "chainId|jsonRpcUrl",
            });
          },
        }),
    );

    this.subscriptions.add(
      connection.sessionConfig$
        .pipe(
          filter(c => c.metadata && c.metadata.EthereumAddress !== undefined),
        )
        .pipe(
          mergeMap(c =>
            aes256gcm.decrypt(c.metadata.EthereumAddress!, session.secret),
          ),
        )
        .subscribe({
          next: selectedAddress => {
            if (this.accountsCallback) {
              this.accountsCallback([selectedAddress]);
            }

            if (WalletSDKRelay.accountRequestCallbackIds.size > 0) {
              // We get the ethereum address from the metadata.  If for whatever
              // reason we don't get a response via an explicit web3 message
              // we can still fulfill the eip1102 request.
              Array.from(
                WalletSDKRelay.accountRequestCallbackIds.values(),
              ).forEach(id => {
                const message = Web3ResponseMessage({
                  id,
                  response: RequestEthereumAccountsResponse([
                    selectedAddress as AddressString,
                  ]),
                });
                this.invokeCallback({ ...message, id });
              });
              WalletSDKRelay.accountRequestCallbackIds.clear();
            }
          },
          error: () => {
            this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
              message: "Had error decrypting",
              value: "selectedAddress",
            });
          },
        }),
    );

    const ui = this.options.uiConstructor({
      linkAPIUrl: this.options.linkAPIUrl,
      version: this.options.version,
      darkMode: this.options.darkMode,
      session,
      connected$: connection.connected$,
      chainId$: this.dappDefaultChainSubject,
    });

    connection.connect();

    return { session, ui, connection };
  }

  public attachUI() {
    this.ui.attach();
  }

  @bind
  public resetAndReload(): void {
    this.connection
      .setSessionMetadata("__destroyed", "1")
      .pipe(
        timeout(1000),
        catchError(_ => of(null)),
      )
      .subscribe(
        _ => {
          const isStandalone = this.ui.isStandalone();

          try {
            this.subscriptions.unsubscribe();
          } catch (err) {
            this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
              message: "Had error unsubscribing",
            });
          }

          this.diagnostic?.log(EVENTS.SESSION_STATE_CHANGE, {
            method: "relay::resetAndReload",
            sessionMetadataChange: "__destroyed, 1",
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
          const storedSession = Session.load(this.storage);
          if (storedSession?.id === this._session.id) {
            this.storage.clear();
          } else if (storedSession) {
            this.diagnostic?.log(EVENTS.SKIPPED_CLEARING_SESSION, {
              sessionIdHash: this.getSessionIdHash(),
              storedSessionIdHash: Session.hash(storedSession.id),
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

          if (isStandalone && this.ui.setStandalone)
            this.ui.setStandalone(true);

          this.attachUI();
        },
        (err: string) => {
          this.diagnostic?.log(EVENTS.FAILURE, {
            method: "relay::resetAndReload",
            message: `failed to reset and reload with ${err}`,
            sessionIdHash: this.getSessionIdHash(),
          });
        },
      );
  }

  public setAppInfo(appName: string, appLogoUrl: string | null): void {
    this.appName = appName;
    this.appLogoUrl = appLogoUrl;
  }

  public getStorageItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  public get session(): Session {
    return this._session;
  }

  public setStorageItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  public signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean,
    typedDataJson?: string | null,
  ): CancelablePromise<SignEthereumMessageResponse> {
    return this.sendRequest<
      SignEthereumMessageRequest,
      SignEthereumMessageResponse
    >({
      method: Web3Method.signEthereumMessage,
      params: {
        message: hexStringFromBuffer(message, true),
        address,
        addPrefix,
        typedDataJson: typedDataJson || null,
      },
    });
  }

  public ethereumAddressFromSignedMessage(
    message: Buffer,
    signature: Buffer,
    addPrefix: boolean,
  ): CancelablePromise<EthereumAddressFromSignedMessageResponse> {
    return this.sendRequest<
      EthereumAddressFromSignedMessageRequest,
      EthereumAddressFromSignedMessageResponse
    >({
      method: Web3Method.ethereumAddressFromSignedMessage,
      params: {
        message: hexStringFromBuffer(message, true),
        signature: hexStringFromBuffer(signature, true),
        addPrefix,
      },
    });
  }

  public signEthereumTransaction(
    params: EthereumTransactionParams,
  ): CancelablePromise<SignEthereumTransactionResponse> {
    return this.sendRequest<
      SignEthereumTransactionRequest,
      SignEthereumTransactionResponse
    >({
      method: Web3Method.signEthereumTransaction,
      params: {
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        weiValue: bigIntStringFromBN(params.weiValue),
        data: hexStringFromBuffer(params.data, true),
        nonce: params.nonce,
        gasPriceInWei: params.gasPriceInWei
          ? bigIntStringFromBN(params.gasPriceInWei)
          : null,
        maxFeePerGas: params.gasPriceInWei
          ? bigIntStringFromBN(params.gasPriceInWei)
          : null,
        maxPriorityFeePerGas: params.gasPriceInWei
          ? bigIntStringFromBN(params.gasPriceInWei)
          : null,
        gasLimit: params.gasLimit ? bigIntStringFromBN(params.gasLimit) : null,
        chainId: params.chainId,
        shouldSubmit: false,
      },
    });
  }

  public signAndSubmitEthereumTransaction(
    params: EthereumTransactionParams,
  ): CancelablePromise<SubmitEthereumTransactionResponse> {
    return this.sendRequest<
      SignEthereumTransactionRequest,
      SubmitEthereumTransactionResponse
    >({
      method: Web3Method.signEthereumTransaction,
      params: {
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        weiValue: bigIntStringFromBN(params.weiValue),
        data: hexStringFromBuffer(params.data, true),
        nonce: params.nonce,
        gasPriceInWei: params.gasPriceInWei
          ? bigIntStringFromBN(params.gasPriceInWei)
          : null,
        maxFeePerGas: params.maxFeePerGas
          ? bigIntStringFromBN(params.maxFeePerGas)
          : null,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas
          ? bigIntStringFromBN(params.maxPriorityFeePerGas)
          : null,
        gasLimit: params.gasLimit ? bigIntStringFromBN(params.gasLimit) : null,
        chainId: params.chainId,
        shouldSubmit: true,
      },
    });
  }

  public submitEthereumTransaction(
    signedTransaction: Buffer,
    chainId: IntNumber,
  ): CancelablePromise<SubmitEthereumTransactionResponse> {
    return this.sendRequest<
      SubmitEthereumTransactionRequest,
      SubmitEthereumTransactionResponse
    >({
      method: Web3Method.submitEthereumTransaction,
      params: {
        signedTransaction: hexStringFromBuffer(signedTransaction, true),
        chainId,
      },
    });
  }

  public scanQRCode(
    regExp: RegExpString,
  ): CancelablePromise<ScanQRCodeResponse> {
    return this.sendRequest<ScanQRCodeRequest, ScanQRCodeResponse>({
      method: Web3Method.scanQRCode,
      params: { regExp },
    });
  }

  public getQRCodeUrl() {
    return createQrUrl(
      this._session.id,
      this._session.secret,
      this.linkAPIUrl,
      false,
      this.options.version,
      this.dappDefaultChain,
    );
  }

  public genericRequest(
    data: object,
    action: string,
  ): CancelablePromise<GenericResponse> {
    return this.sendRequest<GenericRequest, GenericResponse>({
      method: Web3Method.generic,
      params: {
        action,
        data,
      },
    });
  }

  public sendGenericMessage(
    request: GenericRequest,
  ): CancelablePromise<GenericResponse> {
    return this.sendRequest(request);
  }

  public sendRequest<T extends Web3Request, U extends Web3Response>(
    request: T,
  ): CancelablePromise<U> {
    let hideSnackbarItem: (() => void) | null = null;
    const id = randomBytesHex(8);

    const cancel = (error?: Error) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
      hideSnackbarItem?.();
    };

    const promise = new Promise<U>((resolve, reject) => {
      if (!this.ui.isStandalone()) {
        hideSnackbarItem = this.ui.showConnecting({
          isUnlinkedErrorState: this.isUnlinkedErrorState,
          onCancel: cancel,
          onResetConnection: this.resetAndReload, // eslint-disable-line @typescript-eslint/unbound-method
        });
      }

      this.relayEventManager.callbacks.set(id, response => {
        hideSnackbarItem?.();
        if (response.errorMessage) {
          return reject(new Error(response.errorMessage));
        }

        resolve(response as U);
      });

      if (this.ui.isStandalone()) {
        this.sendRequestStandalone(id, request);
      } else {
        this.publishWeb3RequestEvent(id, request);
      }
    });

    return { promise, cancel };
  }

  public setConnectDisabled(disabled: boolean) {
    this.ui.setConnectDisabled(disabled);
  }

  public setAccountsCallback(
    accountsCallback: (accounts: string[], isDisconnect?: boolean) => void,
  ) {
    this.accountsCallback = accountsCallback;
  }

  public setChainCallback(
    chainCallback: (chainId: string, jsonRpcUrl: string) => void,
  ) {
    this.chainCallback = chainCallback;
  }

  public setDappDefaultChainCallback(chainId: number) {
    this.dappDefaultChainSubject.next(chainId);
  }

  private publishWeb3RequestEvent(id: string, request: Web3Request): void {
    const message = Web3RequestMessage({ id, request });
    const storedSession = Session.load(this.storage);
    this.diagnostic?.log(EVENTS.WEB3_REQUEST, {
      eventId: message.id,
      method: `relay::${message.request.method}`,
      sessionIdHash: this.getSessionIdHash(),
      storedSessionIdHash: storedSession ? Session.hash(storedSession.id) : "",
      isSessionMismatched: (storedSession?.id !== this._session.id).toString(),
    });

    this.subscriptions.add(
      this.publishEvent("Web3Request", message, true).subscribe({
        next: _ => {
          this.diagnostic?.log(EVENTS.WEB3_REQUEST_PUBLISHED, {
            eventId: message.id,
            method: `relay::${message.request.method}`,
            sessionIdHash: this.getSessionIdHash(),
            storedSessionIdHash: storedSession
              ? Session.hash(storedSession.id)
              : "",
            isSessionMismatched: (
              storedSession?.id !== this._session.id
            ).toString(),
          });
        },
        error: err => {
          this.handleWeb3ResponseMessage(
            Web3ResponseMessage({
              id: message.id,
              response: {
                method: message.request.method,
                errorMessage: err.message,
              },
            }),
          );
        },
      }),
    );
  }

  private publishWeb3RequestCanceledEvent(id: string) {
    const message = Web3RequestCanceledMessage(id);
    this.subscriptions.add(
      this.publishEvent("Web3RequestCanceled", message, false).subscribe(),
    );
  }

  protected publishEvent(
    event: string,
    message: RelayMessage,
    callWebhook: boolean,
  ): Observable<string> {
    const secret = this.session.secret;
    return new Observable<string>(subscriber => {
      void aes256gcm
        .encrypt(
          JSON.stringify({ ...message, origin: location.origin }),
          secret,
        )
        .then((encrypted: string) => {
          subscriber.next(encrypted);
          subscriber.complete();
        });
    }).pipe(
      mergeMap((encrypted: string) => {
        return this.connection.publishEvent(event, encrypted, callWebhook);
      }),
    );
  }

  @bind
  private handleIncomingEvent(event: ServerMessageEvent): void {
    try {
      this.subscriptions.add(
        aes256gcm
          .decrypt(event.data, this.session.secret)
          .pipe(map(c => JSON.parse(c)))
          .subscribe({
            next: json => {
              const message = isWeb3ResponseMessage(json) ? json : null;
              if (!message) {
                return;
              }

              this.handleWeb3ResponseMessage(message);
            },
            error: () => {
              this.diagnostic?.log(EVENTS.GENERAL_ERROR, {
                message: "Had error decrypting",
                value: "incomingEvent",
              });
            },
          }),
      );
    } catch {
      return;
    }
  }

  private handleWeb3ResponseMessage(message: Web3ResponseMessage) {
    const { response } = message;
    this.diagnostic?.log(EVENTS.WEB3_RESPONSE, {
      eventId: message.id,
      method: `relay::${response.method}`,
      sessionIdHash: this.getSessionIdHash(),
    });
    if (isRequestEthereumAccountsResponse(response)) {
      WalletSDKRelay.accountRequestCallbackIds.forEach(id =>
        this.invokeCallback({ ...message, id }),
      );
      WalletSDKRelay.accountRequestCallbackIds.clear();
      return;
    }

    this.invokeCallback(message);
  }

  private handleErrorResponse(
    id: string,
    method: Web3Method,
    error?: Error,
    errorCode?: number,
  ) {
    this.handleWeb3ResponseMessage(
      Web3ResponseMessage({
        id,
        response: ErrorResponse(
          method,
          (error ?? WalletUIError.UserRejectedRequest).message,
          errorCode,
        ),
      }),
    );
  }

  private invokeCallback(message: Web3ResponseMessage) {
    const callback = this.relayEventManager.callbacks.get(message.id);
    if (callback) {
      callback(message.response);
      this.relayEventManager.callbacks.delete(message.id);
    }
  }

  public requestEthereumAccounts(): CancelablePromise<RequestEthereumAccountsResponse> {
    const request: Web3Request = {
      method: Web3Method.requestEthereumAccounts,
      params: {
        appName: this.appName,
        appLogoUrl: this.appLogoUrl || null,
      },
    };

    const hideSnackbarItem: (() => void) | null = null;
    const id = randomBytesHex(8);

    const cancel = (error?: Error) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      hideSnackbarItem?.();
    };

    const promise = new Promise<RequestEthereumAccountsResponse>(
      (resolve, reject) => {
        this.relayEventManager.callbacks.set(id, response => {
          this.ui.hideRequestEthereumAccounts();
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          hideSnackbarItem?.();

          if (response.errorMessage) {
            return reject(new Error(response.errorMessage));
          }
          resolve(response as RequestEthereumAccountsResponse);
        });

        const userAgent = window?.navigator?.userAgent || null;
        if (
          userAgent &&
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            userAgent,
          )
        ) {
          let location: Location;
          try {
            if (isInIFrame() && window.top) {
              location = window.top.location;
            } else {
              location = window.location;
            }
          } catch (e) {
            location = window.location;
          }

          location.href = `https://go.cb-w.com/xoXnYwQimhb?cb_url=${encodeURIComponent(
            location.href,
          )}`;
          return;
        }

        if (this.ui.inlineAccountsResponse()) {
          const onAccounts = (accounts: [AddressString]) => {
            this.handleWeb3ResponseMessage(
              Web3ResponseMessage({
                id,
                response: RequestEthereumAccountsResponse(accounts),
              }),
            );
          };

          this.ui.requestEthereumAccounts({
            onCancel: cancel,
            onAccounts,
          });
        } else {
          // Error if user closes TryExtensionLinkDialog without connecting
          const err = ethErrors.provider.userRejectedRequest(
            "User denied account authorization",
          );
          this.ui.requestEthereumAccounts({
            onCancel: () => cancel(err),
          });
        }

        WalletSDKRelay.accountRequestCallbackIds.add(id);

        if (!this.ui.inlineAccountsResponse() && !this.ui.isStandalone()) {
          this.publishWeb3RequestEvent(id, request);
        }
      },
    );

    return { promise, cancel };
  }

  selectProvider(
    providerOptions: ProviderType[],
  ): CancelablePromise<SelectProviderResponse> {
    const request: Web3Request = {
      method: Web3Method.selectProvider,
      params: {
        providerOptions,
      },
    };

    const id = randomBytesHex(8);

    const cancel = (error?: Error) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
    };

    const promise = new Promise<SelectProviderResponse>((resolve, reject) => {
      this.relayEventManager.callbacks.set(id, response => {
        if (response.errorMessage) {
          return reject(new Error(response.errorMessage));
        }
        resolve(response as SelectProviderResponse);
      });

      const _cancel = (_error?: Error) => {
        this.handleWeb3ResponseMessage(
          Web3ResponseMessage({
            id,
            response: SelectProviderResponse(ProviderType.Unselected),
          }),
        );
      };

      const approve = (selectedProviderKey: ProviderType) => {
        this.handleWeb3ResponseMessage(
          Web3ResponseMessage({
            id,
            response: SelectProviderResponse(selectedProviderKey),
          }),
        );
      };

      if (this.ui.selectProvider)
        this.ui.selectProvider({
          onApprove: approve,
          onCancel: _cancel,
          providerOptions,
        });
    });

    return { cancel, promise };
  }

  watchAsset(
    type: string,
    address: string,
    symbol?: string,
    decimals?: number,
    image?: string,
    chainId?: string,
  ): CancelablePromise<WatchAssetResponse> {
    const request: Web3Request = {
      method: Web3Method.watchAsset,
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

    const cancel = (error?: Error) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
      hideSnackbarItem?.();
    };

    if (!this.ui.inlineWatchAsset()) {
      hideSnackbarItem = this.ui.showConnecting({
        isUnlinkedErrorState: this.isUnlinkedErrorState,
        onCancel: cancel,
        onResetConnection: this.resetAndReload, // eslint-disable-line @typescript-eslint/unbound-method
      });
    }

    const promise = new Promise<WatchAssetResponse>((resolve, reject) => {
      this.relayEventManager.callbacks.set(id, response => {
        hideSnackbarItem?.();

        if (response.errorMessage) {
          return reject(new Error(response.errorMessage));
        }
        resolve(response as WatchAssetResponse);
      });

      const _cancel = (_error?: Error) => {
        this.handleWeb3ResponseMessage(
          Web3ResponseMessage({
            id,
            response: WatchAssetReponse(false),
          }),
        );
      };

      const approve = () => {
        this.handleWeb3ResponseMessage(
          Web3ResponseMessage({
            id,
            response: WatchAssetReponse(true),
          }),
        );
      };

      if (this.ui.inlineWatchAsset()) {
        this.ui.watchAsset({
          onApprove: approve,
          onCancel: _cancel,
          type,
          address,
          symbol,
          decimals,
          image,
          chainId,
        });
      }

      if (!this.ui.inlineWatchAsset() && !this.ui.isStandalone()) {
        this.publishWeb3RequestEvent(id, request);
      }
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
    },
  ) {
    const request: Web3Request = {
      method: Web3Method.addEthereumChain,
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

    const cancel = (error?: Error) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
      hideSnackbarItem?.();
    };

    if (!this.ui.inlineAddEthereumChain(chainId)) {
      hideSnackbarItem = this.ui.showConnecting({
        isUnlinkedErrorState: this.isUnlinkedErrorState,
        onCancel: cancel,
        onResetConnection: this.resetAndReload, // eslint-disable-line @typescript-eslint/unbound-method
      });
    }

    const promise = new Promise<AddEthereumChainResponse>((resolve, reject) => {
      this.relayEventManager.callbacks.set(id, response => {
        hideSnackbarItem?.();

        if (response.errorMessage) {
          return reject(new Error(response.errorMessage));
        }
        resolve(response as AddEthereumChainResponse);
      });

      const _cancel = (_error?: Error) => {
        this.handleWeb3ResponseMessage(
          Web3ResponseMessage({
            id,
            response: AddEthereumChainResponse({
              isApproved: false,
              rpcUrl: "",
            }),
          }),
        );
      };

      const approve = (rpcUrl: string) => {
        this.handleWeb3ResponseMessage(
          Web3ResponseMessage({
            id,
            response: AddEthereumChainResponse({ isApproved: true, rpcUrl }),
          }),
        );
      };

      if (this.ui.inlineAddEthereumChain(chainId)) {
        this.ui.addEthereumChain({
          onCancel: _cancel,
          onApprove: approve,
          chainId: request.params.chainId,
          rpcUrls: request.params.rpcUrls,
          blockExplorerUrls: request.params.blockExplorerUrls,
          chainName: request.params.chainName,
          iconUrls: request.params.iconUrls,
          nativeCurrency: request.params.nativeCurrency,
        });
      }

      if (!this.ui.inlineAddEthereumChain(chainId) && !this.ui.isStandalone()) {
        this.publishWeb3RequestEvent(id, request);
      }
    });

    return { promise, cancel };
  }

  switchEthereumChain(
    chainId: string,
    address?: string,
  ): CancelablePromise<SwitchEthereumChainResponse> {
    const request: Web3Request = {
      method: Web3Method.switchEthereumChain,
      params: {
        chainId,
        ...{ address },
      },
    };

    const id = randomBytesHex(8);

    const cancel = (error?: Error) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
    };

    const promise = new Promise<SwitchEthereumChainResponse>(
      (resolve, reject) => {
        this.relayEventManager.callbacks.set(id, response => {
          if (response.errorMessage && (response as ErrorResponse).errorCode) {
            return reject(
              ethErrors.provider.custom({
                code: (response as ErrorResponse).errorCode!,
                message: `Unrecognized chain ID. Try adding the chain using addEthereumChain first.`,
              }),
            );
          } else if (response.errorMessage) {
            return reject(new Error(response.errorMessage));
          }

          resolve(response as SwitchEthereumChainResponse);
        });

        const _cancel = (error?: Error | number) => {
          if (typeof error === "number") {
            // backward compatibility
            const errorCode: number = error;
            this.handleWeb3ResponseMessage(
              Web3ResponseMessage({
                id,
                response: ErrorResponse(
                  Web3Method.switchEthereumChain,
                  WalletUIError.SwitchEthereumChainUnsupportedChainId.message,
                  errorCode,
                ),
              }),
            );
          } else if (error instanceof WalletUIError) {
            this.handleErrorResponse(
              id,
              Web3Method.switchEthereumChain,
              error,
              error.errorCode,
            );
          } else {
            this.handleWeb3ResponseMessage(
              Web3ResponseMessage({
                id,
                response: SwitchEthereumChainResponse({
                  isApproved: false,
                  rpcUrl: "",
                }),
              }),
            );
          }
        };

        const approve = (rpcUrl: string) => {
          this.handleWeb3ResponseMessage(
            Web3ResponseMessage({
              id,
              response: SwitchEthereumChainResponse({
                isApproved: true,
                rpcUrl,
              }),
            }),
          );
        };

        this.ui.switchEthereumChain({
          onCancel: _cancel,
          onApprove: approve,
          chainId: request.params.chainId,
          address: request.params.address,
        });

        if (!this.ui.inlineSwitchEthereumChain() && !this.ui.isStandalone()) {
          this.publishWeb3RequestEvent(id, request);
        }
      },
    );

    return { promise, cancel };
  }

  inlineAddEthereumChain(chainId: string): boolean {
    return this.ui.inlineAddEthereumChain(chainId);
  }

  private getSessionIdHash(): string {
    return Session.hash(this._session.id);
  }

  private sendRequestStandalone<T extends Web3Request>(id: string, request: T) {
    const _cancel = (error?: Error) => {
      this.handleErrorResponse(id, request.method, error);
    };

    const onSuccess = (
      response:
        | SignEthereumMessageResponse
        | SignEthereumTransactionResponse
        | SubmitEthereumTransactionResponse
        | EthereumAddressFromSignedMessageResponse,
    ) => {
      this.handleWeb3ResponseMessage(
        Web3ResponseMessage({
          id,
          response,
        }),
      );
    };

    switch (request.method) {
      case Web3Method.signEthereumMessage:
        this.ui.signEthereumMessage({
          request,
          onSuccess,
          onCancel: _cancel,
        });
        break;
      case Web3Method.signEthereumTransaction:
        this.ui.signEthereumTransaction({
          request,
          onSuccess,
          onCancel: _cancel,
        });
        break;
      case Web3Method.submitEthereumTransaction:
        this.ui.submitEthereumTransaction({
          request,
          onSuccess,
          onCancel: _cancel,
        });
        break;
      case Web3Method.ethereumAddressFromSignedMessage:
        this.ui.ethereumAddressFromSignedMessage({
          request,
          onSuccess,
        });
        break;
      default:
        _cancel();
        break;
    }
  }

  protected onSessionConfigChanged(_nextSessionConfig: SessionConfig): void {}
}
