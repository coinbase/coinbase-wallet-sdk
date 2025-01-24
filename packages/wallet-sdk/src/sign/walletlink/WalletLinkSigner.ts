// Copyright (c) 2018-2024 Coinbase, Inc. <https://www.coinbase.com/>

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import eip712 from '../../vendor-js/eth-eip712-util/index.cjs';
import { Signer } from '../interface.js';
import { LOCAL_STORAGE_ADDRESSES_KEY } from './relay/constants.js';
import { EthereumTransactionParams } from './relay/type/EthereumTransactionParams.js';
import { isErrorResponse } from './relay/type/Web3Response.js';
import { WalletLinkRelay } from './relay/WalletLinkRelay.js';
import { WALLETLINK_URL } from ':core/constants.js';
import { standardErrors } from ':core/error/errors.js';
import { AppMetadata, ProviderEventCallback, RequestArguments } from ':core/provider/interface.js';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';
import { Address } from ':core/type/index.js';
import {
  encodeToHexString,
  ensureAddressString,
  ensureBigInt,
  ensureBuffer,
  ensureIntNumber,
  ensureParsedJSONObject,
  hexStringFromBuffer,
  hexStringFromNumber,
} from ':core/type/util.js';
import { fetchRPCRequest } from ':util/provider.js';
const DEFAULT_CHAIN_ID_KEY = 'DefaultChainId';
const DEFAULT_JSON_RPC_URL = 'DefaultJsonRpcUrl';

type RequestParam = unknown[];

// original source: https://github.com/coinbase/coinbase-wallet-sdk/blob/v3.7.1/packages/wallet-sdk/src/provider/CoinbaseWalletProvider.ts
export class WalletLinkSigner implements Signer {
  private metadata: AppMetadata;
  private _relay: WalletLinkRelay | null = null;
  private readonly _storage: ScopedLocalStorage;
  private _addresses: Address[] = [];
  private callback: ProviderEventCallback | null;

  constructor(options: { metadata: AppMetadata; callback?: ProviderEventCallback }) {
    this.metadata = options.metadata;
    this._storage = new ScopedLocalStorage('walletlink', WALLETLINK_URL);
    this.callback = options.callback || null;

    const cachedAddresses = this._storage.getItem(LOCAL_STORAGE_ADDRESSES_KEY);
    if (cachedAddresses) {
      const addresses = cachedAddresses.split(' ') as Address[];
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

  private get selectedAddress(): Address | undefined {
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

    const chainIdNumber = Number.parseInt(request.chainId, 16);

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
    const chainId = Number.parseInt(request.chainId, 16);

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
    const params = (request.params as RequestParam) || [];

    switch (request.method) {
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
      case 'personal_ecRecover':
        return this.ecRecover(request);

      case 'personal_sign':
        return this.personalSign(request);

      case 'eth_signTransaction':
        return this._eth_signTransaction(params);

      case 'eth_sendRawTransaction':
        return this._eth_sendRawTransaction(params);

      case 'eth_sendTransaction':
        return this._eth_sendTransaction(params);

      case 'eth_signTypedData_v1':
      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
      case 'eth_signTypedData':
        return this.signTypedData(request);

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

  private async ecRecover(request: RequestArguments) {
    const { method, params } = request;
    if (!Array.isArray(params)) throw standardErrors.rpc.invalidParams();

    const relay = this.initializeRelay();
    const res = await relay.sendRequest({
      method: 'ethereumAddressFromSignedMessage',
      params: {
        message: encodeToHexString(params[0]),
        signature: encodeToHexString(params[1]),
        addPrefix: method === 'personal_ecRecover',
      },
    });
    if (isErrorResponse(res)) throw res;
    return res.result;
  }

  private getChainId(): number {
    return Number.parseInt(this._storage.getItem(DEFAULT_CHAIN_ID_KEY) ?? '1', 10);
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

  private async personalSign({ params }: RequestArguments) {
    if (!Array.isArray(params)) throw standardErrors.rpc.invalidParams();

    const address = params[1];
    const rawData = params[0];
    this._ensureKnownAddress(address);

    const relay = this.initializeRelay();
    const res = await relay.sendRequest({
      method: 'signEthereumMessage',
      params: {
        address: ensureAddressString(address),
        message: encodeToHexString(rawData),
        addPrefix: true,
        typedDataJson: null,
      },
    });

    if (isErrorResponse(res)) throw res;
    return res.result;
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

  private async signTypedData(request: RequestArguments) {
    const { method, params } = request;
    if (!Array.isArray(params)) throw standardErrors.rpc.invalidParams();

    const encode = (input: object) => {
      const hashFuncMap = {
        eth_signTypedData_v1: eip712.hashForSignTypedDataLegacy,
        eth_signTypedData_v3: eip712.hashForSignTypedData_v3,
        eth_signTypedData_v4: eip712.hashForSignTypedData_v4,
        eth_signTypedData: eip712.hashForSignTypedData_v4,
      };
      return hexStringFromBuffer(
        hashFuncMap[method as keyof typeof hashFuncMap]({
          data: ensureParsedJSONObject(input),
        }) as Buffer,
        true
      );
    };

    const address = params[method === 'eth_signTypedData_v1' ? 1 : 0];
    const rawData = params[method === 'eth_signTypedData_v1' ? 0 : 1];
    this._ensureKnownAddress(address);

    const relay = this.initializeRelay();
    const res = await relay.sendRequest({
      method: 'signEthereumMessage',
      params: {
        address: ensureAddressString(address),
        message: encode(rawData),
        typedDataJson: JSON.stringify(rawData, null, 2),
        addPrefix: false,
      },
    });

    if (isErrorResponse(res)) throw res;
    return res.result;
  }

  private initializeRelay(): WalletLinkRelay {
    if (!this._relay) {
      this._relay = new WalletLinkRelay({
        linkAPIUrl: WALLETLINK_URL,
        storage: this._storage,
        metadata: this.metadata,
        accountsCallback: this._setAddresses.bind(this),
        chainCallback: this.updateProviderInfo.bind(this),
      });
    }
    return this._relay;
  }
}
