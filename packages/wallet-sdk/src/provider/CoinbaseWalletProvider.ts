/* eslint-disable @typescript-eslint/no-explicit-any */
// TODO: Address linting issues

// Copyright (c) 2018-2023 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import BN from 'bn.js';
import { EventEmitter } from 'eventemitter3';

import { serializeError, standardErrorCodes, standardErrors } from '../core/error';
import { AddressString, Callback, HexString, IntNumber, ProviderType } from '../core/type';
import {
  ensureAddressString,
  ensureBN,
  ensureBuffer,
  ensureHexString,
  ensureIntNumber,
  ensureParsedJSONObject,
  ensureRegExpString,
  hexStringFromIntNumber,
  prepend0x,
} from '../core/util';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { MobileRelay } from '../relay/mobile/MobileRelay';
import { LOCAL_STORAGE_ADDRESSES_KEY, RelayAbstract } from '../relay/RelayAbstract';
import { RelayEventManager } from '../relay/RelayEventManager';
import { Session } from '../relay/Session';
import { EthereumTransactionParams } from '../relay/walletlink/type/EthereumTransactionParams';
import { isErrorResponse, Web3Response } from '../relay/walletlink/type/Web3Response';
import eip712 from '../vendor-js/eth-eip712-util';
import { DiagnosticLogger, EVENTS } from './DiagnosticLogger';
import { FilterPolyfill } from './FilterPolyfill';
import { JSONRPCRequest, JSONRPCResponse } from './JSONRPC';
import {
  SubscriptionManager,
  SubscriptionNotification,
  SubscriptionResult,
} from './SubscriptionManager';
import { RequestArguments, Web3Provider } from './Web3Provider';

const DEFAULT_CHAIN_ID_KEY = 'DefaultChainId';
const DEFAULT_JSON_RPC_URL = 'DefaultJsonRpcUrl';

export interface CoinbaseWalletProviderOptions {
  chainId: number;
  jsonRpcUrl: string;
  qrUrl?: string | null;
  overrideIsCoinbaseWallet?: boolean;
  overrideIsCoinbaseBrowser?: boolean;
  overrideIsMetaMask: boolean;
  relayEventManager: RelayEventManager;
  relayProvider: () => Promise<RelayAbstract>;
  storage: ScopedLocalStorage;
  diagnosticLogger?: DiagnosticLogger;
}

interface AddEthereumChainParams {
  chainId: string;
  blockExplorerUrls?: string[];
  chainName?: string;
  iconUrls?: string[];
  rpcUrls?: string[];
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface SwitchEthereumChainParams {
  chainId: string;
}

interface WatchAssetParams {
  type: string;
  options: {
    address: string;
    symbol?: string;
    decimals?: number;
    image?: string;
  };
}

export class CoinbaseWalletProvider extends EventEmitter implements Web3Provider {
  // So dapps can easily identify Coinbase Wallet for enabling features like 3085 network switcher menus
  public readonly isCoinbaseWallet: boolean;
  // So dapps can easily identify Coinbase Dapp Browser for enabling dapp browser specific features
  public readonly isCoinbaseBrowser: boolean;

  public readonly qrUrl?: string | null;
  public reloadOnDisconnect: boolean;

  private readonly _filterPolyfill = new FilterPolyfill(this);
  private readonly _subscriptionManager = new SubscriptionManager(this);

  private readonly _relayProvider: () => Promise<RelayAbstract>;
  private _relay: RelayAbstract | null = null;
  private readonly _storage: ScopedLocalStorage;
  private readonly _relayEventManager: RelayEventManager;
  private readonly diagnostic?: DiagnosticLogger;

  private _chainIdFromOpts: number;
  private _jsonRpcUrlFromOpts: string;
  private readonly _overrideIsMetaMask: boolean;

  private _addresses: AddressString[] = [];

  private hasMadeFirstChainChangedEmission = false;

  constructor(options: Readonly<CoinbaseWalletProviderOptions>) {
    super();

    this.setProviderInfo = this.setProviderInfo.bind(this);
    this.updateProviderInfo = this.updateProviderInfo.bind(this);
    this.getChainId = this.getChainId.bind(this);
    this.setAppInfo = this.setAppInfo.bind(this);
    this.enable = this.enable.bind(this);
    this.close = this.close.bind(this);
    this.send = this.send.bind(this);
    this.sendAsync = this.sendAsync.bind(this);
    this.request = this.request.bind(this);
    this._setAddresses = this._setAddresses.bind(this);
    this.scanQRCode = this.scanQRCode.bind(this);
    this.genericRequest = this.genericRequest.bind(this);

    this._chainIdFromOpts = options.chainId;
    this._jsonRpcUrlFromOpts = options.jsonRpcUrl;
    this._overrideIsMetaMask = options.overrideIsMetaMask;
    this._relayProvider = options.relayProvider;
    this._storage = options.storage;
    this._relayEventManager = options.relayEventManager;
    this.diagnostic = options.diagnosticLogger;
    this.reloadOnDisconnect = true;

    this.isCoinbaseWallet = options.overrideIsCoinbaseWallet ?? true;
    this.isCoinbaseBrowser = options.overrideIsCoinbaseBrowser ?? false;

    this.qrUrl = options.qrUrl;

    const chainId = this.getChainId();
    const chainIdStr = prepend0x(chainId.toString(16));
    // indicate that we've connected, for EIP-1193 compliance
    this.emit('connect', { chainIdStr });

    const cachedAddresses = this._storage.getItem(LOCAL_STORAGE_ADDRESSES_KEY);
    if (cachedAddresses) {
      const addresses = cachedAddresses.split(' ') as AddressString[];
      if (addresses[0] !== '') {
        this._addresses = addresses.map((address) => ensureAddressString(address));
        this.emit('accountsChanged', addresses);
      }
    }

    this._subscriptionManager.events.on(
      'notification',
      (notification: SubscriptionNotification) => {
        this.emit('message', {
          type: notification.method,
          data: notification.params,
        });
      }
    );

    if (this._isAuthorized()) {
      void this.initializeRelay();
    }

    window.addEventListener('message', (event) => {
      // Used to verify the source and window are correct before proceeding
      if (event.origin !== location.origin || event.source !== window) {
        return;
      }

      if (event.data.type !== 'walletLinkMessage') return; // compatibility with CBW extension

      if (event.data.data.action === 'dappChainSwitched') {
        const _chainId = event.data.data.chainId;
        const jsonRpcUrl = event.data.data.jsonRpcUrl ?? this.jsonRpcUrl;
        this.updateProviderInfo(jsonRpcUrl, Number(_chainId));
      }
    });
  }

  /** @deprecated Use `.request({ method: 'eth_accounts' })` instead. */
  public get selectedAddress(): AddressString | undefined {
    return this._addresses[0] || undefined;
  }

  /** @deprecated Use the chain ID. If you still need the network ID, use `.request({ method: 'net_version' })`. */
  public get networkVersion(): string {
    return this.getChainId().toString(10);
  }

  /** @deprecated Use `.request({ method: 'eth_chainId' })` instead. */
  public get chainId(): string {
    return prepend0x(this.getChainId().toString(16));
  }

  public get isWalletLink(): boolean {
    // backward compatibility
    return true;
  }

  /**
   * Some DApps (i.e. Alpha Homora) seem to require the window.ethereum object return
   * true for this method.
   */
  public get isMetaMask(): boolean {
    return this._overrideIsMetaMask;
  }

  public get host(): string {
    return this.jsonRpcUrl;
  }

  public get connected(): boolean {
    return true;
  }

  public isConnected(): boolean {
    return true;
  }

  private get jsonRpcUrl(): string {
    return this._storage.getItem(DEFAULT_JSON_RPC_URL) ?? this._jsonRpcUrlFromOpts;
  }

  private set jsonRpcUrl(value: string) {
    this._storage.setItem(DEFAULT_JSON_RPC_URL, value);
  }

  public disableReloadOnDisconnect() {
    this.reloadOnDisconnect = false;
  }

  public setProviderInfo(jsonRpcUrl: string, chainId: number) {
    if (!this.isCoinbaseBrowser) {
      this._chainIdFromOpts = chainId;
      this._jsonRpcUrlFromOpts = jsonRpcUrl;
    }

    this.updateProviderInfo(this.jsonRpcUrl, this.getChainId());
  }

  private updateProviderInfo(jsonRpcUrl: string, chainId: number) {
    this.jsonRpcUrl = jsonRpcUrl;

    // emit chainChanged event if necessary
    const originalChainId = this.getChainId();
    this._storage.setItem(DEFAULT_CHAIN_ID_KEY, chainId.toString(10));
    const chainChanged = ensureIntNumber(chainId) !== originalChainId;
    if (chainChanged || !this.hasMadeFirstChainChangedEmission) {
      this.emit('chainChanged', this.getChainId());
      this.hasMadeFirstChainChangedEmission = true;
    }
  }

  private async watchAsset(
    type: string,
    address: string,
    symbol?: string,
    decimals?: number,
    image?: string,
    chainId?: number
  ): Promise<boolean> {
    const relay = await this.initializeRelay();
    const result = await relay.watchAsset(
      type,
      address,
      symbol,
      decimals,
      image,
      chainId?.toString()
    ).promise;

    if (isErrorResponse(result)) return false;

    return !!result.result;
  }

  private async addEthereumChain(
    chainId: number,
    rpcUrls: string[],
    blockExplorerUrls: string[],
    chainName: string,
    iconUrls: string[],
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    }
  ): Promise<boolean> {
    if (ensureIntNumber(chainId) === this.getChainId()) {
      return false;
    }

    const relay = await this.initializeRelay();
    const isWhitelistedNetworkOrStandalone = relay.inlineAddEthereumChain(chainId.toString());

    if (!this._isAuthorized() && !isWhitelistedNetworkOrStandalone) {
      await relay.requestEthereumAccounts().promise;
    }

    const res = await relay.addEthereumChain(
      chainId.toString(),
      rpcUrls,
      iconUrls,
      blockExplorerUrls,
      chainName,
      nativeCurrency
    ).promise;

    if (isErrorResponse(res)) return false;

    if (res.result?.isApproved === true) {
      this.updateProviderInfo(rpcUrls[0], chainId);
    }

    return res.result?.isApproved === true;
  }

  private async switchEthereumChain(chainId: number) {
    const relay = await this.initializeRelay();
    const res = await relay.switchEthereumChain(
      chainId.toString(10),
      this.selectedAddress || undefined
    ).promise;

    // backward compatibility
    if (isErrorResponse(res)) {
      if (!res.errorCode) return;
      if (res.errorCode === standardErrorCodes.provider.unsupportedChain) {
        throw standardErrors.provider.unsupportedChain();
      } else {
        throw standardErrors.provider.custom({
          message: res.errorMessage,
          code: res.errorCode,
        });
      }
    }

    const switchResponse = res.result;
    if (switchResponse.isApproved && switchResponse.rpcUrl.length > 0) {
      this.updateProviderInfo(switchResponse.rpcUrl, chainId);
    }
  }

  public setAppInfo(appName: string, appLogoUrl: string | null): void {
    void this.initializeRelay().then((relay) => relay.setAppInfo(appName, appLogoUrl));
  }

  /** @deprecated Use `.request({ method: 'eth_requestAccounts' })` instead. */
  public async enable(): Promise<AddressString[]> {
    this.diagnostic?.log(EVENTS.ETH_ACCOUNTS_STATE, {
      method: 'provider::enable',
      addresses_length: this._addresses.length,
      sessionIdHash: this._relay ? Session.hash(this._relay.session.id) : undefined,
    });

    if (this._isAuthorized()) {
      return [...this._addresses];
    }

    return await this.send<AddressString[]>('eth_requestAccounts');
  }

  public async close() {
    const relay = await this.initializeRelay();
    relay.resetAndReload();
  }

  /** @deprecated Use `.request(...)` instead. */
  public send(request: JSONRPCRequest): JSONRPCResponse;
  public send(request: JSONRPCRequest[]): JSONRPCResponse[];
  public send(request: JSONRPCRequest, callback: Callback<JSONRPCResponse>): void;
  public send(request: JSONRPCRequest[], callback: Callback<JSONRPCResponse[]>): void;
  public send<T = any>(method: string, params?: any[] | any): Promise<T>;
  public send(
    requestOrMethod: JSONRPCRequest | JSONRPCRequest[] | string,
    callbackOrParams?: Callback<JSONRPCResponse> | Callback<JSONRPCResponse[]> | any[] | any
  ): JSONRPCResponse | JSONRPCResponse[] | void | Promise<any> {
    // send<T>(method, params): Promise<T>
    try {
      const result = this._send(requestOrMethod, callbackOrParams);
      if (result instanceof Promise) {
        return result.catch((error) => {
          throw serializeError(error, requestOrMethod);
        });
      }
    } catch (error) {
      throw serializeError(error, requestOrMethod);
    }
  }
  private _send(
    requestOrMethod: JSONRPCRequest | JSONRPCRequest[] | string,
    callbackOrParams?: Callback<JSONRPCResponse> | Callback<JSONRPCResponse[]> | any[] | any
  ): JSONRPCResponse | JSONRPCResponse[] | void | Promise<any> {
    if (typeof requestOrMethod === 'string') {
      const method = requestOrMethod;
      const params = Array.isArray(callbackOrParams)
        ? callbackOrParams
        : callbackOrParams !== undefined
        ? [callbackOrParams]
        : [];
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 0,
        method,
        params,
      };
      return this._sendRequestAsync(request).then((res) => res.result);
    }

    // send(JSONRPCRequest | JSONRPCRequest[], callback): void
    if (typeof callbackOrParams === 'function') {
      const request = requestOrMethod as any;
      const callback = callbackOrParams;
      return this._sendAsync(request, callback);
    }

    // send(JSONRPCRequest[]): JSONRPCResponse[]
    if (Array.isArray(requestOrMethod)) {
      const requests = requestOrMethod;
      return requests.map((r) => this._sendRequest(r));
    }

    // send(JSONRPCRequest): JSONRPCResponse
    const req: JSONRPCRequest = requestOrMethod;
    return this._sendRequest(req);
  }

  /** @deprecated Use `.request(...)` instead. */
  public sendAsync(request: JSONRPCRequest, callback: Callback<JSONRPCResponse>): void;
  public sendAsync(request: JSONRPCRequest[], callback: Callback<JSONRPCResponse[]>): void;
  public async sendAsync(
    request: JSONRPCRequest | JSONRPCRequest[],
    callback: Callback<JSONRPCResponse> | Callback<JSONRPCResponse[]>
  ): Promise<void> {
    try {
      return this._sendAsync(request, callback).catch((error) => {
        throw serializeError(error, request);
      });
    } catch (error) {
      return Promise.reject(serializeError(error, request));
    }
  }
  private async _sendAsync(
    request: JSONRPCRequest | JSONRPCRequest[],
    callback: Callback<JSONRPCResponse> | Callback<JSONRPCResponse[]>
  ): Promise<void> {
    if (typeof callback !== 'function') {
      throw new Error('callback is required');
    }

    // send(JSONRPCRequest[], callback): void
    if (Array.isArray(request)) {
      const arrayCb = callback as Callback<JSONRPCResponse[]>;
      this._sendMultipleRequestsAsync(request)
        .then((responses) => arrayCb(null, responses))
        .catch((err) => arrayCb(err, null));
      return;
    }

    // send(JSONRPCRequest, callback): void
    const cb = callback as Callback<JSONRPCResponse>;
    return this._sendRequestAsync(request)
      .then((response) => cb(null, response))
      .catch((err) => cb(err, null));
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    try {
      return this._request<T>(args).catch((error) => {
        throw serializeError(error, args.method);
      });
    } catch (error) {
      return Promise.reject(serializeError(error, args.method));
    }
  }
  private async _request<T>(args: RequestArguments): Promise<T> {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw standardErrors.rpc.invalidRequest({
        message: 'Expected a single, non-array, object argument.',
        data: args,
      });
    }

    const { method, params } = args;

    if (typeof method !== 'string' || method.length === 0) {
      throw standardErrors.rpc.invalidRequest({
        message: "'args.method' must be a non-empty string.",
        data: args,
      });
    }

    if (
      params !== undefined &&
      !Array.isArray(params) &&
      (typeof params !== 'object' || params === null)
    ) {
      throw standardErrors.rpc.invalidRequest({
        message: "'args.params' must be an object or array if provided.",
        data: args,
      });
    }

    const newParams = params === undefined ? [] : params;

    // Coinbase Wallet Requests
    const id = this._relayEventManager.makeRequestId();
    const result = await this._sendRequestAsync({
      method,
      params: newParams,
      jsonrpc: '2.0',
      id,
    });

    return result.result as T;
  }

  public async scanQRCode(match?: RegExp): Promise<string> {
    const relay = await this.initializeRelay();
    const res = await relay.scanQRCode(ensureRegExpString(match)).promise;
    if (isErrorResponse(res)) {
      throw serializeError(res.errorMessage, 'scanQRCode');
    } else if (typeof res.result !== 'string') {
      throw serializeError('result was not a string', 'scanQRCode');
    }
    return res.result;
  }

  public async genericRequest(data: object, action: string): Promise<string> {
    const relay = await this.initializeRelay();
    const res = await relay.genericRequest(data, action).promise;
    if (isErrorResponse(res)) {
      throw serializeError(res.errorMessage, 'generic');
    } else if (typeof res.result !== 'string') {
      throw serializeError('result was not a string', 'generic');
    }
    return res.result;
  }

  /**
   * @beta
   * This method is currently in beta. While it is available for use, please note that it is still under testing and may undergo significant changes.
   *
   * @remarks
   * IMPORTANT: Signature validation is not performed by this method. Users of this method are advised to perform their own signature validation.
   * Common web3 frontend libraries such as ethers.js and viem provide the `verifyMessage` utility function that can be used for signature validation.
   *
   * It combines `eth_requestAccounts` and "Sign-In with Ethereum" (EIP-4361) into a single call.
   * The returned account and signed message can be used to authenticate the user.
   *
   * @param {Object} params - An object with the following properties:
   * - `nonce` {string}: A unique string to prevent replay attacks.
   * - `statement` {string}: An optional human-readable ASCII assertion that the user will sign.
   * - `resources` {string[]}: An optional list of information the user wishes to have resolved as part of authentication by the relying party.
   *
   * @returns {Promise<ConnectAndSignInResponse>} A promise that resolves to an object with the following properties:
   * - `accounts` {string[]}: The Ethereum accounts of the user.
   * - `message` {string}: The overall message that the user signed. Hex encoded.
   * - `signature` {string}: The signature of the message, signed with the user's private key. Hex encoded.
   */
  public async connectAndSignIn(params: {
    nonce: string;
    statement?: string;
    resources?: string[];
  }): Promise<{
    accounts: AddressString[];
    message: HexString;
    signature: HexString;
  }> {
    // NOTE: It was intentionally built by following the pattern of the existing eth_requestAccounts method
    // to maintain consistency and avoid introducing a new pattern.
    // We acknowledge the need for a better design, and it is planned to address and improve it in a future refactor.

    this.diagnostic?.log(EVENTS.ETH_ACCOUNTS_STATE, {
      method: 'provider::connectAndSignIn',
      sessionIdHash: this._relay ? Session.hash(this._relay.session.id) : undefined,
    });

    let res: Web3Response<'connectAndSignIn'>;
    try {
      const relay = await this.initializeRelay();
      if (!(relay instanceof MobileRelay)) {
        throw new Error('connectAndSignIn is only supported on mobile');
      }
      res = await relay.connectAndSignIn(params).promise;
      if (isErrorResponse(res)) {
        throw new Error(res.errorMessage);
      }
    } catch (err: any) {
      if (typeof err.message === 'string' && err.message.match(/(denied|rejected)/i)) {
        throw standardErrors.provider.userRejectedRequest('User denied account authorization');
      }
      throw err;
    }

    if (!res.result) {
      throw new Error('accounts received is empty');
    }

    const { accounts } = res.result;

    this._setAddresses(accounts);
    if (!this.isCoinbaseBrowser) {
      await this.switchEthereumChain(this.getChainId());
    }

    return res.result;
  }

  public async selectProvider(providerOptions: ProviderType[]): Promise<ProviderType> {
    const relay = await this.initializeRelay();
    const res = await relay.selectProvider(providerOptions).promise;
    if (isErrorResponse(res)) {
      throw serializeError(res.errorMessage, 'selectProvider');
    } else if (typeof res.result !== 'string') {
      throw serializeError('result was not a string', 'selectProvider');
    }
    return res.result;
  }

  public supportsSubscriptions(): boolean {
    return false;
  }

  public subscribe(): void {
    throw new Error('Subscriptions are not supported');
  }

  public unsubscribe(): void {
    throw new Error('Subscriptions are not supported');
  }

  public disconnect(): boolean {
    return true;
  }

  private _sendRequest(request: JSONRPCRequest): JSONRPCResponse {
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      id: request.id,
    };
    const { method } = request;

    response.result = this._handleSynchronousMethods(request);

    if (response.result === undefined) {
      throw new Error(
        `Coinbase Wallet does not support calling ${method} synchronously without ` +
          `a callback. Please provide a callback parameter to call ${method} ` +
          `asynchronously.`
      );
    }

    return response;
  }

  protected _setAddresses(addresses: string[], _?: boolean): void {
    if (!Array.isArray(addresses)) {
      throw new Error('addresses is not an array');
    }

    const newAddresses = addresses.map((address) => ensureAddressString(address));

    if (JSON.stringify(newAddresses) === JSON.stringify(this._addresses)) {
      return;
    }

    this._addresses = newAddresses;
    this.emit('accountsChanged', this._addresses);
    this._storage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, newAddresses.join(' '));
  }

  private _sendRequestAsync(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    return new Promise<JSONRPCResponse>((resolve, reject) => {
      try {
        const syncResult = this._handleSynchronousMethods(request);
        if (syncResult !== undefined) {
          return resolve({
            jsonrpc: '2.0',
            id: request.id,
            result: syncResult,
          });
        }

        const filterPromise = this._handleAsynchronousFilterMethods(request);
        if (filterPromise !== undefined) {
          filterPromise
            .then((res) => resolve({ ...res, id: request.id }))
            .catch((err) => reject(err));
          return;
        }

        const subscriptionPromise = this._handleSubscriptionMethods(request);
        if (subscriptionPromise !== undefined) {
          subscriptionPromise
            .then((res) =>
              resolve({
                jsonrpc: '2.0',
                id: request.id,
                result: res.result,
              })
            )
            .catch((err) => reject(err));
          return;
        }
      } catch (err: any) {
        return reject(err);
      }

      this._handleAsynchronousMethods(request)
        .then((res) => res && resolve({ ...res, id: request.id }))
        .catch((err) => reject(err));
    });
  }

  private _sendMultipleRequestsAsync(requests: JSONRPCRequest[]): Promise<JSONRPCResponse[]> {
    return Promise.all(requests.map((r) => this._sendRequestAsync(r)));
  }

  private _handleSynchronousMethods(request: JSONRPCRequest) {
    const { method } = request;
    const params = request.params || [];

    switch (method) {
      case 'eth_accounts':
        return this._eth_accounts();

      case 'eth_coinbase':
        return this._eth_coinbase();

      case 'eth_uninstallFilter':
        return this._eth_uninstallFilter(params);

      case 'net_version':
        return this._net_version();

      case 'eth_chainId':
        return this._eth_chainId();

      default:
        return undefined;
    }
  }

  private async _handleAsynchronousMethods(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse | void> {
    const { method } = request;
    const params = request.params || [];

    switch (method) {
      case 'eth_requestAccounts':
        return this._eth_requestAccounts();

      case 'eth_sign':
        return this._eth_sign(params);

      case 'eth_ecRecover':
        return this._eth_ecRecover(params);

      case 'personal_sign':
        return this._personal_sign(params);

      case 'personal_ecRecover':
        return this._personal_ecRecover(params);

      case 'eth_signTransaction':
        return this._eth_signTransaction(params);

      case 'eth_sendRawTransaction':
        return this._eth_sendRawTransaction(params);

      case 'eth_sendTransaction':
        return this._eth_sendTransaction(params);

      case 'eth_signTypedData_v1':
        return this._eth_signTypedData_v1(params);

      case 'eth_signTypedData_v2':
        return this._throwUnsupportedMethodError();

      case 'eth_signTypedData_v3':
        return this._eth_signTypedData_v3(params);

      case 'eth_signTypedData_v4':
      case 'eth_signTypedData':
        return this._eth_signTypedData_v4(params);

      case 'cbWallet_arbitrary':
        return this._cbwallet_arbitrary(params);

      case 'wallet_addEthereumChain':
        return this._wallet_addEthereumChain(params);

      case 'wallet_switchEthereumChain':
        return this._wallet_switchEthereumChain(params);

      case 'wallet_watchAsset':
        return this._wallet_watchAsset(params);
    }

    const relay = await this.initializeRelay();
    return relay.makeEthereumJSONRPCRequest(request, this.jsonRpcUrl).catch((err) => {
      if (
        err.code === standardErrorCodes.rpc.methodNotFound ||
        err.code === standardErrorCodes.rpc.methodNotSupported
      ) {
        this.diagnostic?.log(EVENTS.METHOD_NOT_IMPLEMENTED, {
          method: request.method,
          sessionIdHash: this._relay ? Session.hash(this._relay.session.id) : undefined,
        });
      }

      throw err;
    });
  }

  private _handleAsynchronousFilterMethods(
    request: JSONRPCRequest
  ): Promise<JSONRPCResponse> | undefined {
    const { method } = request;
    const params = request.params || [];

    switch (method) {
      case 'eth_newFilter':
        return this._eth_newFilter(params);

      case 'eth_newBlockFilter':
        return this._eth_newBlockFilter();

      case 'eth_newPendingTransactionFilter':
        return this._eth_newPendingTransactionFilter();

      case 'eth_getFilterChanges':
        return this._eth_getFilterChanges(params);

      case 'eth_getFilterLogs':
        return this._eth_getFilterLogs(params);
    }

    return undefined;
  }

  private _handleSubscriptionMethods(
    request: JSONRPCRequest
  ): Promise<SubscriptionResult> | undefined {
    switch (request.method) {
      case 'eth_subscribe':
      case 'eth_unsubscribe':
        return this._subscriptionManager.handleRequest(request);
    }

    return undefined;
  }

  private _isKnownAddress(addressString: string): boolean {
    try {
      const addressStr = ensureAddressString(addressString);
      const lowercaseAddresses = this._addresses.map((address) => ensureAddressString(address));
      return lowercaseAddresses.includes(addressStr);
    } catch {
      // noop
    }
    return false;
  }

  private _ensureKnownAddress(addressString: string): void {
    if (!this._isKnownAddress(addressString)) {
      this.diagnostic?.log(EVENTS.UNKNOWN_ADDRESS_ENCOUNTERED);
      throw new Error('Unknown Ethereum address');
    }
  }

  private _prepareTransactionParams(tx: {
    from?: unknown;
    to?: unknown;
    gasPrice?: unknown;
    maxFeePerGas?: unknown;
    maxPriorityFeePerGas?: unknown;
    gas?: unknown;
    value?: unknown;
    data?: unknown;
    nonce?: unknown;
    chainId?: unknown;
  }): EthereumTransactionParams {
    const fromAddress = tx.from ? ensureAddressString(tx.from) : this.selectedAddress;
    if (!fromAddress) {
      throw new Error('Ethereum address is unavailable');
    }

    this._ensureKnownAddress(fromAddress);

    const toAddress = tx.to ? ensureAddressString(tx.to) : null;
    const weiValue = tx.value != null ? ensureBN(tx.value) : new BN(0);
    const data = tx.data ? ensureBuffer(tx.data) : Buffer.alloc(0);
    const nonce = tx.nonce != null ? ensureIntNumber(tx.nonce) : null;
    const gasPriceInWei = tx.gasPrice != null ? ensureBN(tx.gasPrice) : null;
    const maxFeePerGas = tx.maxFeePerGas != null ? ensureBN(tx.maxFeePerGas) : null;
    const maxPriorityFeePerGas =
      tx.maxPriorityFeePerGas != null ? ensureBN(tx.maxPriorityFeePerGas) : null;
    const gasLimit = tx.gas != null ? ensureBN(tx.gas) : null;
    const chainId = tx.chainId ? ensureIntNumber(tx.chainId) : this.getChainId();

    return {
      fromAddress,
      toAddress,
      weiValue,
      data,
      nonce,
      gasPriceInWei,
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasLimit,
      chainId,
    };
  }

  protected _isAuthorized(): boolean {
    return this._addresses.length > 0;
  }

  private _requireAuthorization(): void {
    if (!this._isAuthorized()) {
      throw standardErrors.provider.unauthorized({});
    }
  }

  private _throwUnsupportedMethodError(): Promise<JSONRPCResponse> {
    throw standardErrors.provider.unsupportedMethod({});
  }

  private async _signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean,
    typedDataJson?: string | null
  ): Promise<JSONRPCResponse> {
    this._ensureKnownAddress(address);

    try {
      const relay = await this.initializeRelay();
      const res = await relay.signEthereumMessage(message, address, addPrefix, typedDataJson)
        .promise;
      if (isErrorResponse(res)) {
        throw new Error(res.errorMessage);
      }
      return { jsonrpc: '2.0', id: 0, result: res.result };
    } catch (err: any) {
      if (typeof err.message === 'string' && err.message.match(/(denied|rejected)/i)) {
        throw standardErrors.provider.userRejectedRequest('User denied message signature');
      }
      throw err;
    }
  }

  private async _ethereumAddressFromSignedMessage(
    message: Buffer,
    signature: Buffer,
    addPrefix: boolean
  ): Promise<JSONRPCResponse> {
    const relay = await this.initializeRelay();
    const res = await relay.ethereumAddressFromSignedMessage(message, signature, addPrefix).promise;
    if (isErrorResponse(res)) {
      throw new Error(res.errorMessage);
    }
    return { jsonrpc: '2.0', id: 0, result: res.result };
  }

  private _eth_accounts(): string[] {
    return [...this._addresses];
  }

  private _eth_coinbase(): string | null {
    return this.selectedAddress || null;
  }

  private _net_version(): string {
    return this.getChainId().toString(10);
  }

  private _eth_chainId(): string {
    return hexStringFromIntNumber(this.getChainId());
  }

  private getChainId(): IntNumber {
    const chainIdStr = this._storage.getItem(DEFAULT_CHAIN_ID_KEY);

    if (!chainIdStr) {
      return ensureIntNumber(this._chainIdFromOpts);
    }

    const chainId = parseInt(chainIdStr, 10);
    return ensureIntNumber(chainId);
  }

  private async _eth_requestAccounts(): Promise<JSONRPCResponse> {
    this.diagnostic?.log(EVENTS.ETH_ACCOUNTS_STATE, {
      method: 'provider::_eth_requestAccounts',
      addresses_length: this._addresses.length,
      sessionIdHash: this._relay ? Session.hash(this._relay.session.id) : undefined,
    });

    if (this._isAuthorized()) {
      return Promise.resolve({
        jsonrpc: '2.0',
        id: 0,
        result: this._addresses,
      });
    }

    let res: Web3Response<'requestEthereumAccounts'>;
    try {
      const relay = await this.initializeRelay();
      res = await relay.requestEthereumAccounts().promise;
      if (isErrorResponse(res)) {
        throw new Error(res.errorMessage);
      }
    } catch (err: any) {
      if (typeof err.message === 'string' && err.message.match(/(denied|rejected)/i)) {
        throw standardErrors.provider.userRejectedRequest('User denied account authorization');
      }
      throw err;
    }

    if (!res.result) {
      throw new Error('accounts received is empty');
    }

    this._setAddresses(res.result);
    if (!this.isCoinbaseBrowser) {
      await this.switchEthereumChain(this.getChainId());
    }

    return { jsonrpc: '2.0', id: 0, result: this._addresses };
  }

  private _eth_sign(params: unknown[]): Promise<JSONRPCResponse> {
    this._requireAuthorization();
    const address = ensureAddressString(params[0]);
    const message = ensureBuffer(params[1]);

    return this._signEthereumMessage(message, address, false);
  }

  private _eth_ecRecover(params: unknown[]): Promise<JSONRPCResponse> {
    const message = ensureBuffer(params[0]);
    const signature = ensureBuffer(params[1]);
    return this._ethereumAddressFromSignedMessage(message, signature, false);
  }

  private _personal_sign(params: unknown[]): Promise<JSONRPCResponse> {
    this._requireAuthorization();
    const message = ensureBuffer(params[0]);
    const address = ensureAddressString(params[1]);

    return this._signEthereumMessage(message, address, true);
  }

  private _personal_ecRecover(params: unknown[]): Promise<JSONRPCResponse> {
    const message = ensureBuffer(params[0]);
    const signature = ensureBuffer(params[1]);

    return this._ethereumAddressFromSignedMessage(message, signature, true);
  }

  private async _eth_signTransaction(params: unknown[]): Promise<JSONRPCResponse> {
    this._requireAuthorization();
    const tx = this._prepareTransactionParams((params[0] as any) || {});
    try {
      const relay = await this.initializeRelay();
      const res = await relay.signEthereumTransaction(tx).promise;
      if (isErrorResponse(res)) {
        throw new Error(res.errorMessage);
      }
      return { jsonrpc: '2.0', id: 0, result: res.result };
    } catch (err: any) {
      if (typeof err.message === 'string' && err.message.match(/(denied|rejected)/i)) {
        throw standardErrors.provider.userRejectedRequest('User denied transaction signature');
      }
      throw err;
    }
  }

  private async _eth_sendRawTransaction(params: unknown[]): Promise<JSONRPCResponse> {
    const signedTransaction = ensureBuffer(params[0]);
    const relay = await this.initializeRelay();
    const res = await relay.submitEthereumTransaction(signedTransaction, this.getChainId()).promise;
    if (isErrorResponse(res)) {
      throw new Error(res.errorMessage);
    }
    return { jsonrpc: '2.0', id: 0, result: res.result };
  }

  private async _eth_sendTransaction(params: unknown[]): Promise<JSONRPCResponse> {
    this._requireAuthorization();
    const tx = this._prepareTransactionParams((params[0] as any) || {});
    try {
      const relay = await this.initializeRelay();
      const res = await relay.signAndSubmitEthereumTransaction(tx).promise;
      if (isErrorResponse(res)) {
        throw new Error(res.errorMessage);
      }
      return { jsonrpc: '2.0', id: 0, result: res.result };
    } catch (err: any) {
      if (typeof err.message === 'string' && err.message.match(/(denied|rejected)/i)) {
        throw standardErrors.provider.userRejectedRequest('User denied transaction signature');
      }
      throw err;
    }
  }

  private async _eth_signTypedData_v1(params: unknown[]): Promise<JSONRPCResponse> {
    this._requireAuthorization();
    const typedData = ensureParsedJSONObject(params[0]);
    const address = ensureAddressString(params[1]);

    this._ensureKnownAddress(address);

    const message = eip712.hashForSignTypedDataLegacy({ data: typedData });
    const typedDataJSON = JSON.stringify(typedData, null, 2);

    return this._signEthereumMessage(message, address, false, typedDataJSON);
  }

  private async _eth_signTypedData_v3(params: unknown[]): Promise<JSONRPCResponse> {
    this._requireAuthorization();
    const address = ensureAddressString(params[0]);
    const typedData = ensureParsedJSONObject(params[1]);

    this._ensureKnownAddress(address);

    const message = eip712.hashForSignTypedData_v3({ data: typedData });
    const typedDataJSON = JSON.stringify(typedData, null, 2);

    return this._signEthereumMessage(message, address, false, typedDataJSON);
  }

  private async _eth_signTypedData_v4(params: unknown[]): Promise<JSONRPCResponse> {
    this._requireAuthorization();
    const address = ensureAddressString(params[0]);
    const typedData = ensureParsedJSONObject(params[1]);

    this._ensureKnownAddress(address);

    const message = eip712.hashForSignTypedData_v4({ data: typedData });
    const typedDataJSON = JSON.stringify(typedData, null, 2);

    return this._signEthereumMessage(message, address, false, typedDataJSON);
  }

  /** @deprecated */
  private async _cbwallet_arbitrary(params: unknown[]): Promise<JSONRPCResponse> {
    const action = params[0];
    const data = params[1];
    if (typeof data !== 'string') {
      throw new Error('parameter must be a string');
    }

    if (typeof action !== 'object' || action === null) {
      throw new Error('parameter must be an object');
    }

    const result = await this.genericRequest(action, data);
    return { jsonrpc: '2.0', id: 0, result };
  }

  private async _wallet_addEthereumChain(params: unknown[]): Promise<JSONRPCResponse> {
    const request = params[0] as AddEthereumChainParams;

    if (request.rpcUrls?.length === 0) {
      return {
        jsonrpc: '2.0',
        id: 0,
        error: { code: 2, message: `please pass in at least 1 rpcUrl` },
      };
    }

    if (!request.chainName || request.chainName.trim() === '') {
      throw standardErrors.rpc.invalidParams('chainName is a required field');
    }

    if (!request.nativeCurrency) {
      throw standardErrors.rpc.invalidParams('nativeCurrency is a required field');
    }

    const chainIdNumber = parseInt(request.chainId, 16);
    const success = await this.addEthereumChain(
      chainIdNumber,
      request.rpcUrls ?? [],
      request.blockExplorerUrls ?? [],
      request.chainName,
      request.iconUrls ?? [],
      request.nativeCurrency
    );
    if (success) {
      return { jsonrpc: '2.0', id: 0, result: null };
    }
    return {
      jsonrpc: '2.0',
      id: 0,
      error: { code: 2, message: `unable to add ethereum chain` },
    };
  }

  private async _wallet_switchEthereumChain(params: unknown[]): Promise<JSONRPCResponse> {
    const request = params[0] as SwitchEthereumChainParams;
    await this.switchEthereumChain(parseInt(request.chainId, 16));
    return { jsonrpc: '2.0', id: 0, result: null };
  }

  private async _wallet_watchAsset(params: unknown): Promise<JSONRPCResponse> {
    const request = (Array.isArray(params) ? params[0] : params) as WatchAssetParams;
    if (!request.type) {
      throw standardErrors.rpc.invalidParams('Type is required');
    }

    if (request?.type !== 'ERC20') {
      throw standardErrors.rpc.invalidParams(`Asset of type '${request.type}' is not supported`);
    }

    if (!request?.options) {
      throw standardErrors.rpc.invalidParams('Options are required');
    }

    if (!request?.options.address) {
      throw standardErrors.rpc.invalidParams('Address is required');
    }

    const chainId = this.getChainId();
    const { address, symbol, image, decimals } = request.options;

    const res = await this.watchAsset(request.type, address, symbol, decimals, image, chainId);

    return { jsonrpc: '2.0', id: 0, result: res };
  }

  private _eth_uninstallFilter(params: unknown[]): boolean {
    const filterId = ensureHexString(params[0]);
    return this._filterPolyfill.uninstallFilter(filterId);
  }

  private async _eth_newFilter(params: unknown[]): Promise<JSONRPCResponse> {
    const param = params[0] as any;
    const filterId = await this._filterPolyfill.newFilter(param);
    return { jsonrpc: '2.0', id: 0, result: filterId };
  }

  private async _eth_newBlockFilter(): Promise<JSONRPCResponse> {
    const filterId = await this._filterPolyfill.newBlockFilter();
    return { jsonrpc: '2.0', id: 0, result: filterId };
  }

  private async _eth_newPendingTransactionFilter(): Promise<JSONRPCResponse> {
    const filterId = await this._filterPolyfill.newPendingTransactionFilter();
    return { jsonrpc: '2.0', id: 0, result: filterId };
  }

  private _eth_getFilterChanges(params: unknown[]): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0]);
    return this._filterPolyfill.getFilterChanges(filterId);
  }

  private _eth_getFilterLogs(params: unknown[]): Promise<JSONRPCResponse> {
    const filterId = ensureHexString(params[0]);
    return this._filterPolyfill.getFilterLogs(filterId);
  }

  private initializeRelay(): Promise<RelayAbstract> {
    if (this._relay) {
      return Promise.resolve(this._relay);
    }

    return this._relayProvider().then((relay) => {
      relay.setAccountsCallback((accounts, isDisconnect) =>
        this._setAddresses(accounts, isDisconnect)
      );
      relay.setChainCallback((chainId, jsonRpcUrl) => {
        this.updateProviderInfo(jsonRpcUrl, parseInt(chainId, 10));
      });
      relay.setDappDefaultChainCallback(this._chainIdFromOpts);
      this._relay = relay;
      return relay;
    });
  }
}
