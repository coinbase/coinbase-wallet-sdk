// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>

import eip712 from '../../vendor-js/eth-eip712-util';
import { Signer } from '../interface';
import { LOCAL_STORAGE_ADDRESSES_KEY } from './relay/constants';
import { EthereumTransactionParams } from './relay/type/EthereumTransactionParams';
import { isErrorResponse } from './relay/type/Web3Response';
import { WalletLinkRelay } from './relay/WalletLinkRelay';
import { ScopedLocalStorage } from './storage/ScopedLocalStorage';
import { WALLETLINK_URL } from ':core/constants';
import { standardErrors } from ':core/error';
import { AppMetadata, ProviderEventCallback, RequestArguments } from ':core/provider/interface';
import { AddressString, IntNumber } from ':core/type';
import {
  ensureAddressString,
  ensureBigInt,
  ensureBuffer,
  ensureIntNumber,
  ensureParsedJSONObject,
  hexStringFromNumber,
} from ':core/type/util';
import { fetchRPCRequest } from ':util/provider';
const DEFAULT_CHAIN_ID_KEY = 'DefaultChainId';
const DEFAULT_JSON_RPC_URL = 'DefaultJsonRpcUrl';

type RequestParam = unknown[];

// original source: https://github.com/coinbase/coinbase-wallet-sdk/blob/v3.7.1/packages/wallet-sdk/src/provider/CoinbaseWalletProvider.ts
export class WalletLinkSigner implements Signer {
  private metadata: AppMetadata;
  private _relay: WalletLinkRelay | null = null;
  private readonly _storage: ScopedLocalStorage;
  private _addresses: AddressString[] = [];
  private callback: ProviderEventCallback | null;

  constructor(options: { metadata: AppMetadata; callback?: ProviderEventCallback }) {
    this.metadata = options.metadata;
    this._storage = new ScopedLocalStorage('walletlink', WALLETLINK_URL);
    this.callback = options.callback || null;

    const cachedAddresses = this._storage.getItem(LOCAL_STORAGE_ADDRESSES_KEY);
    if (cachedAddresses) {
      const addresses = cachedAddresses.split(' ') as AddressString[];
      if (addresses[0] !== '') {
        this._addresses = addresses.map((address) => ensureAddressString(address));
      }
    }

    this.initializeRelay();
  }

  getSession() {
    const relay = this.initializeRelay();
    const { id, secret } = relay.getWalletLinkSession();
    return { id, secret };
  }

  async handshake() {
    await this._eth_requestAccounts();
  }

  private get selectedAddress(): AddressString | undefined {
    return this._addresses[0] || undefined;
  }

  private get jsonRpcUrl(): string | undefined {
    return this._storage.getItem(DEFAULT_JSON_RPC_URL) ?? undefined;
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
    if (chainChanged) {
      this.callback?.('chainChanged', hexStringFromNumber(chainId));
    }
  }

  private async watchAsset(params: RequestParam) {
    const request = (Array.isArray(params) ? params[0] : params) as {
      type: string;
      options: {
        address: string;
        symbol?: string;
        decimals?: number;
        image?: string;
      };
    };
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

    const relay = this.initializeRelay();
    const result = await relay.watchAsset(
      request.type,
      address,
      symbol,
      decimals,
      image,
      chainId?.toString()
    );

    if (isErrorResponse(result)) return false;

    return !!result.result;
  }

  private async addEthereumChain(params: RequestParam) {
    const request = params[0] as {
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
    };

    if (request.rpcUrls?.length === 0) {
      throw standardErrors.rpc.invalidParams('please pass in at least 1 rpcUrl');
    }

    if (!request.chainName || request.chainName.trim() === '') {
      throw standardErrors.rpc.invalidParams('chainName is a required field');
    }

    if (!request.nativeCurrency) {
      throw standardErrors.rpc.invalidParams('nativeCurrency is a required field');
    }

    const chainIdNumber = parseInt(request.chainId, 16);

    if (chainIdNumber === this.getChainId()) {
      return false;
    }

    const relay = this.initializeRelay();

    const {
      rpcUrls = [],
      blockExplorerUrls = [],
      chainName,
      iconUrls = [],
      nativeCurrency,
    } = request;

    const res = await relay.addEthereumChain(
      chainIdNumber.toString(),
      rpcUrls,
      iconUrls,
      blockExplorerUrls,
      chainName,
      nativeCurrency
    );

    if (isErrorResponse(res)) return false;

    if (res.result?.isApproved === true) {
      this.updateProviderInfo(rpcUrls[0], chainIdNumber);
      return null;
    }
    throw standardErrors.rpc.internal('unable to add ethereum chain');
  }

  private async switchEthereumChain(params: RequestParam) {
    const request = params[0] as {
      chainId: string;
    };
    const chainId = parseInt(request.chainId, 16);

    const relay = this.initializeRelay();
    const res = await relay.switchEthereumChain(
      chainId.toString(10),
      this.selectedAddress || undefined
    );

    if (isErrorResponse(res)) throw res;

    const switchResponse = res.result;
    if (switchResponse.isApproved && switchResponse.rpcUrl.length > 0) {
      this.updateProviderInfo(switchResponse.rpcUrl, chainId);
    }

    return null;
  }

  public async cleanup() {
    this.callback = null;
    if (this._relay) {
      this._relay.resetAndReload();
    }
    this._storage.clear();
  }

  private _setAddresses(addresses: string[], _?: boolean): void {
    if (!Array.isArray(addresses)) {
      throw new Error('addresses is not an array');
    }

    const newAddresses = addresses.map((address) => ensureAddressString(address));

    if (JSON.stringify(newAddresses) === JSON.stringify(this._addresses)) {
      return;
    }

    this._addresses = newAddresses;
    this.callback?.('accountsChanged', newAddresses);
    this._storage.setItem(LOCAL_STORAGE_ADDRESSES_KEY, newAddresses.join(' '));
  }

  async request(request: RequestArguments) {
    const { method } = request;
    const params = (request.params as RequestParam) || [];

    switch (method) {
      case 'eth_accounts':
        return [...this._addresses];
      case 'eth_coinbase':
        return this.selectedAddress || null;
      case 'net_version':
        return this.getChainId().toString(10);
      case 'eth_chainId':
        return hexStringFromNumber(this.getChainId());

      case 'eth_requestAccounts':
        return this._eth_requestAccounts();

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

      case 'eth_signTypedData_v3':
        return this._eth_signTypedData_v3(params);

      case 'eth_signTypedData_v4':
      case 'eth_signTypedData':
        return this._eth_signTypedData_v4(params);

      case 'wallet_addEthereumChain':
        return this.addEthereumChain(params);

      case 'wallet_switchEthereumChain':
        return this.switchEthereumChain(params);

      case 'wallet_watchAsset':
        return this.watchAsset(params);

      default:
        if (!this.jsonRpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');
        return fetchRPCRequest(request, this.jsonRpcUrl);
    }
  }

  private _ensureKnownAddress(addressString: string): void {
    const addressStr = ensureAddressString(addressString);
    const lowercaseAddresses = this._addresses.map((address) => ensureAddressString(address));
    if (!lowercaseAddresses.includes(addressStr)) {
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

  private async _signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean,
    typedDataJson?: string | null
  ) {
    this._ensureKnownAddress(address);

    const relay = this.initializeRelay();
    const res = await relay.signEthereumMessage(message, address, addPrefix, typedDataJson);
    if (isErrorResponse(res)) throw res;
    return res.result;
  }

  private async _ethereumAddressFromSignedMessage(
    message: Buffer,
    signature: Buffer,
    addPrefix: boolean
  ) {
    const relay = this.initializeRelay();
    const res = await relay.ethereumAddressFromSignedMessage(message, signature, addPrefix);
    if (isErrorResponse(res)) throw res;
    return res.result;
  }

  private getChainId(): IntNumber {
    const chainIdStr = this._storage.getItem(DEFAULT_CHAIN_ID_KEY);

    if (!chainIdStr) {
      return ensureIntNumber(1); // default to mainnet
    }

    const chainId = parseInt(chainIdStr, 10);
    return ensureIntNumber(chainId);
  }

  private async _eth_requestAccounts() {
    if (this._addresses.length > 0) {
      this.callback?.('connect', { chainId: hexStringFromNumber(this.getChainId()) });
      return this._addresses;
    }

    const relay = this.initializeRelay();
    const res = await relay.requestEthereumAccounts();
    if (isErrorResponse(res)) throw res;

    if (!res.result) {
      throw new Error('accounts received is empty');
    }

    this._setAddresses(res.result);
    this.callback?.('connect', { chainId: hexStringFromNumber(this.getChainId()) });
    return this._addresses;
  }

  private _eth_ecRecover(params: RequestParam) {
    const message = ensureBuffer(params[0]);
    const signature = ensureBuffer(params[1]);
    return this._ethereumAddressFromSignedMessage(message, signature, false);
  }

  private _personal_sign(params: RequestParam) {
    const message = ensureBuffer(params[0]);
    const address = ensureAddressString(params[1]);

    return this._signEthereumMessage(message, address, true);
  }

  private _personal_ecRecover(params: RequestParam) {
    const message = ensureBuffer(params[0]);
    const signature = ensureBuffer(params[1]);

    return this._ethereumAddressFromSignedMessage(message, signature, true);
  }

  private async _eth_signTransaction(params: RequestParam) {
    const tx = this._prepareTransactionParams(params[0] || {});

    const relay = this.initializeRelay();
    const res = await relay.signEthereumTransaction(tx);
    if (isErrorResponse(res)) throw res;
    return res.result;
  }

  private async _eth_sendRawTransaction(params: RequestParam) {
    const signedTransaction = ensureBuffer(params[0]);
    const relay = this.initializeRelay();
    const res = await relay.submitEthereumTransaction(signedTransaction, this.getChainId());
    if (isErrorResponse(res)) throw res;
    return res.result;
  }

  private async _eth_sendTransaction(params: RequestParam) {
    const tx = this._prepareTransactionParams(params[0] || {});

    const relay = this.initializeRelay();
    const res = await relay.signAndSubmitEthereumTransaction(tx);
    if (isErrorResponse(res)) throw res;
    return res.result;
  }

  private async _eth_signTypedData_v1(params: RequestParam) {
    const typedData = ensureParsedJSONObject(params[0]);
    const address = ensureAddressString(params[1]);

    this._ensureKnownAddress(address);

    const message = eip712.hashForSignTypedDataLegacy({ data: typedData });
    const typedDataJSON = JSON.stringify(typedData, null, 2);

    return this._signEthereumMessage(message, address, false, typedDataJSON);
  }

  private async _eth_signTypedData_v3(params: RequestParam) {
    const address = ensureAddressString(params[0]);
    const typedData = ensureParsedJSONObject(params[1]);

    this._ensureKnownAddress(address);

    const message = eip712.hashForSignTypedData_v3({ data: typedData });
    const typedDataJSON = JSON.stringify(typedData, null, 2);

    return this._signEthereumMessage(message, address, false, typedDataJSON);
  }

  private async _eth_signTypedData_v4(params: RequestParam) {
    const address = ensureAddressString(params[0]);
    const typedData = ensureParsedJSONObject(params[1]);

    this._ensureKnownAddress(address);

    const message = eip712.hashForSignTypedData_v4({ data: typedData });
    const typedDataJSON = JSON.stringify(typedData, null, 2);

    return this._signEthereumMessage(message, address, false, typedDataJSON);
  }

  private initializeRelay(): WalletLinkRelay {
    if (!this._relay) {
      const relay = new WalletLinkRelay({
        linkAPIUrl: WALLETLINK_URL,
        storage: this._storage,
      });
      const { appName, appLogoUrl } = this.metadata;
      relay.setAppInfo(appName, appLogoUrl);
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
