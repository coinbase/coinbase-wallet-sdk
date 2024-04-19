/* eslint-disable @typescript-eslint/no-explicit-any */

// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>

import eip712 from '../../../vendor-js/eth-eip712-util';
import { StateUpdateListener } from '../../interface';
import { LOCAL_STORAGE_ADDRESSES_KEY } from './RelayAbstract';
import { RelayEventManager } from './RelayEventManager';
import { EthereumTransactionParams } from './type/EthereumTransactionParams';
import { JSONRPCRequest, JSONRPCResponse } from './type/JSONRPC';
import { isErrorResponse, Web3Response } from './type/Web3Response';
import { WalletLinkRelay } from './WalletLinkRelay';
import { standardErrorCodes, standardErrors } from ':core/error';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage';
import { AddressString, IntNumber } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';
import {
  ensureAddressString,
  ensureBigInt,
  ensureBuffer,
  ensureIntNumber,
  ensureParsedJSONObject,
  hexStringFromIntNumber,
} from ':core/util';

const DEFAULT_CHAIN_ID_KEY = 'DefaultChainId';
const DEFAULT_JSON_RPC_URL = 'DefaultJsonRpcUrl';

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

export class WLRelayAdapter {
  private _appName: string;
  private _appLogoUrl: string | null;
  private _relay: WalletLinkRelay | null = null;
  private readonly _walletlinkUrl: string;
  private readonly _storage: ScopedLocalStorage;
  private readonly _relayEventManager: RelayEventManager;
  private _jsonRpcUrlFromOpts: string;
  private _addresses: AddressString[] = [];
  private hasMadeFirstChainChangedEmission = false;
  private updateListener: StateUpdateListener;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    walletlinkUrl: string;
    updateListener: StateUpdateListener;
  }) {
    this._appName = options.appName;
    this._appLogoUrl = options.appLogoUrl;
    this._walletlinkUrl = options.walletlinkUrl;
    this._storage = new ScopedLocalStorage('walletlink', this._walletlinkUrl);
    this.updateListener = options.updateListener;

    this._relayEventManager = new RelayEventManager();
    this._jsonRpcUrlFromOpts = '';

    const cachedAddresses = this._storage.getItem(LOCAL_STORAGE_ADDRESSES_KEY);
    if (cachedAddresses) {
      const addresses = cachedAddresses.split(' ') as AddressString[];
      if (addresses[0] !== '') {
        this._addresses = addresses.map((address) => ensureAddressString(address));
        this.updateListener.onAccountsUpdate({
          accounts: this._addresses,
          source: 'storage',
        });
      }
    }

    const cachedChainId = this._storage.getItem(DEFAULT_CHAIN_ID_KEY);
    if (cachedChainId) {
      this.updateListener.onChainUpdate({
        chain: {
          id: this.getChainId(),
          rpcUrl: this.jsonRpcUrl,
        },
        source: 'storage',
      });
      this.hasMadeFirstChainChangedEmission = true;
    }
  }

  getWalletLinkSession() {
    const relay = this.initializeRelay();
    return relay.getWalletLinkSession();
  }

  get selectedAddress(): AddressString | undefined {
    return this._addresses[0] || undefined;
  }

  private get jsonRpcUrl(): string {
    return this._storage.getItem(DEFAULT_JSON_RPC_URL) ?? this._jsonRpcUrlFromOpts;
  }

  private set jsonRpcUrl(value: string) {
    this._storage.setItem(DEFAULT_JSON_RPC_URL, value);
  }

  private updateProviderInfo(jsonRpcUrl: string, chainId: number) {
    this.jsonRpcUrl = jsonRpcUrl;

    // emit chainChanged event if necessary
    const originalChainId = this.getChainId();
    this._storage.setItem(DEFAULT_CHAIN_ID_KEY, chainId.toString(10));
    const chainChanged = ensureIntNumber(chainId) !== originalChainId;
    if (chainChanged || !this.hasMadeFirstChainChangedEmission) {
      this.updateListener.onChainUpdate({
        chain: { id: chainId, rpcUrl: jsonRpcUrl },
        source: 'wallet',
      });
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
    const relay = this.initializeRelay();
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

    const relay = this.initializeRelay();

    if (!this._isAuthorized()) {
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
    const relay = this.initializeRelay();
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

  public async close() {
    const relay = this.initializeRelay();
    relay.resetAndReload();
    this._storage.clear();
  }

  public async request<T>(args: RequestArguments): Promise<T> {
    try {
      return this._request<T>(args).catch((error) => {
        throw error;
      });
    } catch (error) {
      return Promise.reject(error);
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

  protected _setAddresses(addresses: string[], _?: boolean): void {
    if (!Array.isArray(addresses)) {
      throw new Error('addresses is not an array');
    }

    const newAddresses = addresses.map((address) => ensureAddressString(address));

    if (JSON.stringify(newAddresses) === JSON.stringify(this._addresses)) {
      return;
    }

    this._addresses = newAddresses;
    this.updateListener.onAccountsUpdate({
      accounts: newAddresses,
      source: 'wallet',
    });
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
      } catch (err: any) {
        return reject(err);
      }

      this._handleAsynchronousMethods(request)
        .then((res) => res && resolve({ ...res, id: request.id }))
        .catch((err) => reject(err));
    });
  }

  private _handleSynchronousMethods(request: JSONRPCRequest) {
    const { method } = request;

    switch (method) {
      case 'eth_accounts':
        return this._eth_accounts();

      case 'eth_coinbase':
        return this._eth_coinbase();

      case 'net_version':
        return this._net_version();

      case 'eth_chainId':
        return this._eth_chainId();

      default:
        return undefined;
    }
  }

  private async _handleAsynchronousMethods(request: JSONRPCRequest): Promise<JSONRPCResponse> {
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

      case 'wallet_addEthereumChain':
        return this._wallet_addEthereumChain(params);

      case 'wallet_switchEthereumChain':
        return this._wallet_switchEthereumChain(params);

      case 'wallet_watchAsset':
        return this._wallet_watchAsset(params);

      default:
        return this._throwUnsupportedMethodError();
    }
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
    const weiValue = tx.value != null ? ensureBigInt(tx.value) : BigInt(0);
    const data = tx.data ? ensureBuffer(tx.data) : Buffer.alloc(0);
    const nonce = tx.nonce != null ? ensureIntNumber(tx.nonce) : null;
    const gasPriceInWei = tx.gasPrice != null ? ensureBigInt(tx.gasPrice) : null;
    const maxFeePerGas = tx.maxFeePerGas != null ? ensureBigInt(tx.maxFeePerGas) : null;
    const maxPriorityFeePerGas =
      tx.maxPriorityFeePerGas != null ? ensureBigInt(tx.maxPriorityFeePerGas) : null;
    const gasLimit = tx.gas != null ? ensureBigInt(tx.gas) : null;
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
      const relay = this.initializeRelay();
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
    const relay = this.initializeRelay();
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
      return ensureIntNumber(1); // default to mainnet
    }

    const chainId = parseInt(chainIdStr, 10);
    return ensureIntNumber(chainId);
  }

  private async _eth_requestAccounts(): Promise<JSONRPCResponse> {
    if (this._isAuthorized()) {
      return Promise.resolve({
        jsonrpc: '2.0',
        id: 0,
        result: this._addresses,
      });
    }

    let res: Web3Response<'requestEthereumAccounts'>;
    try {
      const relay = this.initializeRelay();
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
      const relay = this.initializeRelay();
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
    const relay = this.initializeRelay();
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
      const relay = this.initializeRelay();
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

  private initializeRelay(): WalletLinkRelay {
    if (!this._relay) {
      const relay = new WalletLinkRelay({
        linkAPIUrl: this._walletlinkUrl,
        storage: this._storage,
      });
      relay.setAppInfo(this._appName, this._appLogoUrl);
      relay.attachUI();

      relay.setAccountsCallback((accounts, isDisconnect) =>
        this._setAddresses(accounts, isDisconnect)
      );
      relay.setChainCallback((chainId, jsonRpcUrl) => {
        this.updateProviderInfo(jsonRpcUrl, parseInt(chainId, 10));
      });
      this._relay = relay;
    }
    return this._relay;
  }
}
