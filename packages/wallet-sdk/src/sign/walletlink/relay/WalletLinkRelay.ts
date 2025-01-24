// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>

import {
  WalletLinkConnection,
  WalletLinkConnectionUpdateListener,
} from './connection/WalletLinkConnection.js';
import { LOCAL_STORAGE_ADDRESSES_KEY } from './constants.js';
import { RelayEventManager } from './RelayEventManager.js';
import { EthereumTransactionParams } from './type/EthereumTransactionParams.js';
import { WalletLinkEventData } from './type/WalletLinkEventData.js';
import { WalletLinkSession } from './type/WalletLinkSession.js';
import { Web3Method, Web3Request } from './type/Web3Request.js';
import { isErrorResponse, Web3Response } from './type/Web3Response.js';
import { isMobileWeb } from './ui/components/util.js';
import { RelayUI } from './ui/RelayUI.js';
import { WalletLinkRelayUI } from './ui/WalletLinkRelayUI.js';
import { WLMobileRelayUI } from './ui/WLMobileRelayUI.js';
import { standardErrors } from ':core/error/errors.js';
import { AppMetadata } from ':core/provider/interface.js';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';
import { Address } from ':core/type/index.js';
import { bigIntStringFromBigInt, hexStringFromBuffer, randomBytesHex } from ':core/type/util.js';

export interface WalletLinkRelayOptions {
  linkAPIUrl: string;
  storage: ScopedLocalStorage;
  metadata: AppMetadata;
  accountsCallback: (account: string[]) => void;
  chainCallback: (jsonRpcUrl: string, chainId: number) => void;
}

export class WalletLinkRelay implements WalletLinkConnectionUpdateListener {
  private static accountRequestCallbackIds = new Set<string>();

  private readonly linkAPIUrl: string;
  private readonly storage: ScopedLocalStorage;
  private _session: WalletLinkSession;
  private readonly relayEventManager: RelayEventManager;
  private connection: WalletLinkConnection;
  private accountsCallback: (account: string[]) => void;
  private chainCallbackParams = { chainId: '', jsonRpcUrl: '' }; // to implement distinctUntilChanged
  private chainCallback: (jsonRpcUrl: string, chainId: number) => void;

  private ui: RelayUI;
  private isMobileWeb = isMobileWeb();

  private metadata: AppMetadata;
  isLinked: boolean | undefined;
  isUnlinkedErrorState: boolean | undefined;

  constructor(options: Readonly<WalletLinkRelayOptions>) {
    this.resetAndReload = this.resetAndReload.bind(this);

    this.linkAPIUrl = options.linkAPIUrl;
    this.storage = options.storage;
    this.metadata = options.metadata;
    this.accountsCallback = options.accountsCallback;
    this.chainCallback = options.chainCallback;

    const { session, ui, connection } = this.subscribe();

    this._session = session;
    this.connection = connection;

    this.relayEventManager = new RelayEventManager();

    this.ui = ui;
    this.ui.attach();
  }

  private subscribe() {
    const session = WalletLinkSession.load(this.storage) || WalletLinkSession.create(this.storage);

    const { linkAPIUrl } = this;
    const connection = new WalletLinkConnection({
      session,
      linkAPIUrl,
      listener: this,
    });

    const ui = this.isMobileWeb ? new WLMobileRelayUI() : new WalletLinkRelayUI();

    connection.connect();

    return { session, ui, connection };
  }

  linkedUpdated = (linked: boolean) => {
    this.isLinked = linked;
    const cachedAddresses = this.storage.getItem(LOCAL_STORAGE_ADDRESSES_KEY);

    if (linked) {
      // Only set linked session variable one way
      this._session.linked = linked;
    }

    this.isUnlinkedErrorState = false;

    if (cachedAddresses) {
      const addresses = cachedAddresses.split(' ') as string[];
      const wasConnectedViaStandalone = this.storage.getItem('IsStandaloneSigning') === 'true';
      if (addresses[0] !== '' && !linked && this._session.linked && !wasConnectedViaStandalone) {
        this.isUnlinkedErrorState = true;
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
      this.chainCallback(jsonRpcUrl, Number.parseInt(chainId, 10));
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
        this.invokeCallback(id, {
          method: 'requestEthereumAccounts',
          result: [selectedAddress as Address],
        });
      });
      WalletLinkRelay.accountRequestCallbackIds.clear();
    }
  };

  public resetAndReload(): void {
    this.connection
      .destroy()
      .then(() => {
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
          ScopedLocalStorage.clearAll();
        }

        document.location.reload();
      })
      .catch((_) => {});
  }

  public signEthereumTransaction(params: EthereumTransactionParams) {
    return this.sendRequest({
      method: 'signEthereumTransaction',
      params: {
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        weiValue: bigIntStringFromBigInt(params.weiValue),
        data: hexStringFromBuffer(params.data, true),
        nonce: params.nonce,
        gasPriceInWei: params.gasPriceInWei ? bigIntStringFromBigInt(params.gasPriceInWei) : null,
        maxFeePerGas: params.gasPriceInWei ? bigIntStringFromBigInt(params.gasPriceInWei) : null,
        maxPriorityFeePerGas: params.gasPriceInWei
          ? bigIntStringFromBigInt(params.gasPriceInWei)
          : null,
        gasLimit: params.gasLimit ? bigIntStringFromBigInt(params.gasLimit) : null,
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
        weiValue: bigIntStringFromBigInt(params.weiValue),
        data: hexStringFromBuffer(params.data, true),
        nonce: params.nonce,
        gasPriceInWei: params.gasPriceInWei ? bigIntStringFromBigInt(params.gasPriceInWei) : null,
        maxFeePerGas: params.maxFeePerGas ? bigIntStringFromBigInt(params.maxFeePerGas) : null,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas
          ? bigIntStringFromBigInt(params.maxPriorityFeePerGas)
          : null,
        gasLimit: params.gasLimit ? bigIntStringFromBigInt(params.gasLimit) : null,
        chainId: params.chainId,
        shouldSubmit: true,
      },
    });
  }

  public submitEthereumTransaction(signedTransaction: Buffer, chainId: number) {
    return this.sendRequest({
      method: 'submitEthereumTransaction',
      params: {
        signedTransaction: hexStringFromBuffer(signedTransaction, true),
        chainId,
      },
    });
  }

  public getWalletLinkSession() {
    return this._session;
  }

  public sendRequest<
    RequestMethod extends Web3Method,
    ResponseMethod extends Web3Method = RequestMethod,
    Response = Web3Response<ResponseMethod>,
  >(request: Web3Request<RequestMethod>): Promise<Response> {
    let hideSnackbarItem: (() => void) | null = null;
    const id = randomBytesHex(8);

    const cancel = (error?: Error) => {
      this.publishWeb3RequestCanceledEvent(id);
      this.handleErrorResponse(id, request.method, error);
      hideSnackbarItem?.();
    };

    return new Promise<Response>((resolve, reject) => {
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
  }

  private publishWeb3RequestEvent(id: string, request: Web3Request): void {
    const message: WalletLinkEventData = { type: 'WEB3_REQUEST', id, request };
    this.publishEvent('Web3Request', message, true)
      .then((_) => {})
      .catch((err) => {
        this.handleWeb3ResponseMessage(message.id, {
          method: request.method,
          errorMessage: err.message,
        });
      });

    if (this.isMobileWeb) {
      this.openCoinbaseWalletDeeplink(request.method);
    }
  }

  // copied from MobileRelay
  private openCoinbaseWalletDeeplink(method: Web3Method) {
    if (!(this.ui instanceof WLMobileRelayUI)) return;

    // For mobile relay requests, open the Coinbase Wallet app
    switch (method) {
      case 'requestEthereumAccounts': // requestEthereumAccounts is handled via popup
      case 'switchEthereumChain': // switchEthereumChain doesn't need to open the app
        return;
      default:
        window.addEventListener(
          'blur',
          () => {
            window.addEventListener(
              'focus',
              () => {
                this.connection.checkUnseenEvents();
              },
              { once: true }
            );
          },
          { once: true }
        );
        this.ui.openCoinbaseWalletDeeplink();
        break;
    }
  }

  private publishWeb3RequestCanceledEvent(id: string) {
    const message: WalletLinkEventData = {
      type: 'WEB3_REQUEST_CANCELED',
      id,
    };
    this.publishEvent('Web3RequestCanceled', message, false).then();
  }

  private publishEvent(
    event: string,
    message: WalletLinkEventData,
    callWebhook: boolean
  ): Promise<string> {
    return this.connection.publishEvent(event, message, callWebhook);
  }

  handleWeb3ResponseMessage(id: string, response: Web3Response) {
    if (response.method === 'requestEthereumAccounts') {
      WalletLinkRelay.accountRequestCallbackIds.forEach((id) => this.invokeCallback(id, response));
      WalletLinkRelay.accountRequestCallbackIds.clear();
      return;
    }

    this.invokeCallback(id, response);
  }

  private handleErrorResponse(id: string, method: Web3Method, error?: Error) {
    const errorMessage = error?.message ?? 'Unspecified error message.';
    this.handleWeb3ResponseMessage(id, {
      method,
      errorMessage,
    });
  }

  private invokeCallback(id: string, response: Web3Response) {
    const callback = this.relayEventManager.callbacks.get(id);
    if (callback) {
      callback(response);
      this.relayEventManager.callbacks.delete(id);
    }
  }

  public requestEthereumAccounts() {
    const { appName, appLogoUrl } = this.metadata;
    const request: Web3Request = {
      method: 'requestEthereumAccounts',
      params: {
        appName,
        appLogoUrl,
      },
    };

    const hideSnackbarItem: (() => void) | null = null;
    const id = randomBytesHex(8);

    return new Promise<Web3Response<'requestEthereumAccounts'>>((resolve, reject) => {
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
  }

  watchAsset(
    type: string,
    address: string,
    symbol?: string,
    decimals?: number,
    image?: string,
    chainId?: string
  ): Promise<Web3Response<'watchAsset'>> {
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

    const cancel = (error?: Error) => {
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

    return new Promise<Web3Response<'watchAsset'>>((resolve, reject) => {
      this.relayEventManager.callbacks.set(id, (response) => {
        hideSnackbarItem?.();

        if (isErrorResponse(response)) {
          return reject(new Error(response.errorMessage));
        }
        resolve(response as Web3Response<'watchAsset'>);
      });

      this.publishWeb3RequestEvent(id, request);
    });
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

    const cancel = (error?: Error) => {
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

    return new Promise<Web3Response<'addEthereumChain'>>((resolve, reject) => {
      this.relayEventManager.callbacks.set(id, (response) => {
        hideSnackbarItem?.();

        if (isErrorResponse(response)) {
          return reject(new Error(response.errorMessage));
        }
        resolve(response as Web3Response<'addEthereumChain'>);
      });

      this.publishWeb3RequestEvent(id, request);
    });
  }

  switchEthereumChain(
    chainId: string,
    address?: string
  ): Promise<Web3Response<'switchEthereumChain'>> {
    const request: Web3Request = {
      method: 'switchEthereumChain',
      params: {
        chainId,
        ...{ address },
      },
    };

    let hideSnackbarItem: (() => void) | null = null;
    const id = randomBytesHex(8);

    const cancel = (error?: Error) => {
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

    return new Promise<Web3Response<'switchEthereumChain'>>((resolve, reject) => {
      this.relayEventManager.callbacks.set(id, (response) => {
        hideSnackbarItem?.();
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
  }
}
