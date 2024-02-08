import BN from 'bn.js';

import { standardErrorCodes, standardErrors } from '../../core/error';
import { AddressString, HexString, IntNumber } from '../../core/type';
import {
  ensureAddressString,
  ensureBN,
  ensureBuffer,
  ensureIntNumber,
  ensureParsedJSONObject,
} from '../../core/util';
import { JSONRPCResponse } from '../../provider/JSONRPC';
import { RequestArguments } from '../../provider/ProviderInterface';
import {
  AddEthereumChainParams,
  SwitchEthereumChainParams,
} from '../../relay/walletlink/LegacyProvider';
import { EthereumTransactionParams } from '../../relay/walletlink/type/EthereumTransactionParams';
import { isErrorResponse, Web3Response } from '../../relay/walletlink/type/Web3Response';
import { WalletLinkRelay, WalletLinkRelayOptions } from '../../relay/walletlink/WalletLinkRelay';
import eip712 from '../../vendor-js/eth-eip712-util';
import { Connector, ConnectorUpdateListener } from '../ConnectorInterface';

// For now this is just a wrapper around the legacy WalletLinkRelay
export class WalletLinkConnector implements Connector {
  legacyRelay: WalletLinkRelay;
  private resolveHandshake?: (accounts: AddressString[]) => void;
  private dappDefaultChain = 1;
  private _connectionTypeSelectionResolver: ((value: unknown) => void) | undefined;
  private _accounts: AddressString[] = [];
  private _chainId: number | undefined;
  private updateListener: ConnectorUpdateListener;

  constructor({
    legacyRelayOptions,
    _connectionTypeSelectionResolver,
    _accounts,
    updateListener,
  }: {
    legacyRelayOptions: Readonly<WalletLinkRelayOptions>;
    _connectionTypeSelectionResolver: ((value: unknown) => void) | undefined;
    _accounts: AddressString[];
    updateListener: ConnectorUpdateListener;
  }) {
    this.legacyRelay = new WalletLinkRelay(legacyRelayOptions);
    this._connectionTypeSelectionResolver = _connectionTypeSelectionResolver;
    this.accountsCallback = this.accountsCallback.bind(this);
    this.chainCallback = this.chainCallback.bind(this);
    this.legacyRelay.setAccountsCallback(this.accountsCallback);
    this.legacyRelay.setChainCallback(this.chainCallback);
    this.legacyRelay.setDappDefaultChainCallback(this.dappDefaultChain);
    this._accounts = _accounts;
    this.updateListener = updateListener;
  }

  public async handshake(): Promise<AddressString[]> {
    const accounts = await this._eth_requestAccounts();
    return accounts;
  }

  // The callback triggered by QR Code Scanning
  private async chainCallback(chainId: string, rpcUrl: string) {
    this._chainId = parseInt(chainId, 10);
    this.updateListener.onChainChanged(this, {
      id: this._chainId,
      rpcUrl,
    });
    // as soon as qr code is scanned, resolve hanging selection type promise
    // since we never get a response for that in the case of walletlink
    this._connectionTypeSelectionResolver?.('walletlink');
  }

  private accountsCallback(accounts: string[]) {
    this.resolveHandshake?.(accounts as AddressString[]);
  }

  public request<T>(requestArgs: RequestArguments): Promise<T> {
    return this._handleRequest<T>(requestArgs);
  }

  private async _handleRequest<T>(request: RequestArguments): Promise<T> {
    const { method } = request;
    const params = (request.params || []) as unknown[];

    switch (method) {
      case 'eth_requestAccounts':
        return this._eth_requestAccounts() as T;

      case 'eth_ecRecover':
        return this._eth_ecRecover(params) as T;

      case 'personal_sign':
        return this._personal_sign(params) as T;

      case 'personal_ecRecover':
        return this._personal_ecRecover(params) as T;

      case 'eth_signTransaction':
        return this._eth_signTransaction(params) as T;

      case 'eth_sendRawTransaction':
        return this._eth_sendRawTransaction(params) as T;

      case 'eth_sendTransaction':
        return this._eth_sendTransaction(params) as T;

      case 'eth_signTypedData_v1':
        return this._eth_signTypedData_v1(params) as T;

      case 'eth_signTypedData_v3':
        return this._eth_signTypedData_v3(params) as T;

      case 'eth_signTypedData_v4':
      case 'eth_signTypedData':
        return this._eth_signTypedData_v4(params) as T;

      case 'wallet_addEthereumChain':
        return this._wallet_addEthereumChain(params) as T;

      case 'wallet_switchEthereumChain':
        return this._wallet_switchEthereumChain(params) as T;

      // case 'wallet_watchAsset':
      //   return this._wallet_watchAsset(params) as T;
      default:
        throw standardErrors.provider.unsupportedMethod(method);
    }
  }

  private async _eth_requestAccounts(): Promise<AddressString[]> {
    let res: Web3Response<'requestEthereumAccounts'>;
    try {
      res = await this.legacyRelay.requestEthereumAccounts().promise;
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

    this._accounts = res.result;
    return res.result;
  }

  private _eth_ecRecover(params: unknown[]): Promise<AddressString> {
    const message = ensureBuffer(params[0]);
    const signature = ensureBuffer(params[1]);
    return this._ethereumAddressFromSignedMessage(message, signature, false);
  }

  private _personal_sign(params: unknown[]): Promise<HexString> {
    const message = ensureBuffer(params[0]);
    const address = ensureAddressString(params[1]);

    return this._signEthereumMessage(message, address, true);
  }

  private _personal_ecRecover(params: unknown[]): Promise<AddressString> {
    const message = ensureBuffer(params[0]);
    const signature = ensureBuffer(params[1]);

    return this._ethereumAddressFromSignedMessage(message, signature, true);
  }

  private async _eth_signTransaction(params: unknown[]): Promise<HexString> {
    const tx = this._prepareTransactionParams((params[0] as any) || {});
    try {
      const res = await this.legacyRelay.signEthereumTransaction(tx).promise;
      if (isErrorResponse(res)) {
        throw new Error(res.errorMessage);
      }
      return res.result;
    } catch (err: any) {
      if (typeof err.message === 'string' && err.message.match(/(denied|rejected)/i)) {
        throw standardErrors.provider.userRejectedRequest('User denied transaction signature');
      }
      throw err;
    }
  }

  private async _eth_sendRawTransaction(params: unknown[]): Promise<HexString> {
    const signedTransaction = ensureBuffer(params[0]);

    const res = await this.legacyRelay.submitEthereumTransaction(
      signedTransaction,
      this._chainId as IntNumber
    ).promise;
    if (isErrorResponse(res)) {
      throw new Error(res.errorMessage);
    }
    return res.result;
  }

  private async _eth_sendTransaction(params: unknown[]): Promise<HexString> {
    const tx = this._prepareTransactionParams((params[0] as any) || {});
    try {
      const res = await this.legacyRelay.signAndSubmitEthereumTransaction(tx).promise;
      if (isErrorResponse(res)) {
        throw new Error(res.errorMessage);
      }
      return res.result;
    } catch (err: any) {
      if (typeof err.message === 'string' && err.message.match(/(denied|rejected)/i)) {
        throw standardErrors.provider.userRejectedRequest('User denied transaction signature');
      }
      throw err;
    }
  }

  private async _eth_signTypedData_v1(params: unknown[]): Promise<HexString> {
    const typedData = ensureParsedJSONObject(params[0]);
    const address = ensureAddressString(params[1]);

    this._ensureKnownAddress(address);

    const message = eip712.hashForSignTypedDataLegacy({ data: typedData });
    const typedDataJSON = JSON.stringify(typedData, null, 2);

    return this._signEthereumMessage(message, address, false, typedDataJSON);
  }

  private async _eth_signTypedData_v3(params: unknown[]): Promise<HexString> {
    const address = ensureAddressString(params[0]);
    const typedData = ensureParsedJSONObject(params[1]);

    this._ensureKnownAddress(address);

    const message = eip712.hashForSignTypedData_v3({ data: typedData });
    const typedDataJSON = JSON.stringify(typedData, null, 2);

    return this._signEthereumMessage(message, address, false, typedDataJSON);
  }

  private async _eth_signTypedData_v4(params: unknown[]): Promise<HexString> {
    const address = ensureAddressString(params[0]);
    const typedData = ensureParsedJSONObject(params[1]);

    this._ensureKnownAddress(address);

    const message = eip712.hashForSignTypedData_v4({ data: typedData });
    const typedDataJSON = JSON.stringify(typedData, null, 2);

    return this._signEthereumMessage(message, address, false, typedDataJSON);
  }

  private async _signEthereumMessage(
    message: Buffer,
    address: AddressString,
    addPrefix: boolean,
    typedDataJson?: string | null
  ): Promise<HexString> {
    this._ensureKnownAddress(address);

    try {
      const res = await this.legacyRelay.signEthereumMessage(
        message,
        address,
        addPrefix,
        typedDataJson
      ).promise;
      if (isErrorResponse(res)) {
        throw new Error(res.errorMessage);
      }
      return res.result;
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
  ): Promise<AddressString> {
    const res = await this.legacyRelay.ethereumAddressFromSignedMessage(
      message,
      signature,
      addPrefix
    ).promise;
    if (isErrorResponse(res)) {
      throw new Error(res.errorMessage);
    }
    return res.result;
  }

  private _isKnownAddress(addressString: string): boolean {
    try {
      const addressStr = ensureAddressString(addressString);
      const lowercaseAddresses = this._accounts.map((address) => ensureAddressString(address));
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
    const fromAddress = tx.from ? ensureAddressString(tx.from) : this._accounts[0];
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
    const chainId = tx.chainId ? ensureIntNumber(tx.chainId) : (this._chainId as IntNumber);

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
    if (ensureIntNumber(chainId) === this._chainId) {
      return false;
    }

    const res = await this.legacyRelay.addEthereumChain(
      chainId.toString(),
      rpcUrls,
      iconUrls,
      blockExplorerUrls,
      chainName,
      nativeCurrency
    ).promise;

    if (isErrorResponse(res)) return false;

    if (res.result?.isApproved === true) {
      this.updateListener.onChainChanged(this, {
        id: chainId,
        rpcUrl: rpcUrls[0],
      });
    }

    return res.result?.isApproved === true;
  }

  private async _wallet_switchEthereumChain(params: unknown[]): Promise<JSONRPCResponse> {
    const request = params[0] as SwitchEthereumChainParams;
    await this.switchEthereumChain(parseInt(request.chainId, 16));
    return { jsonrpc: '2.0', id: 0, result: null };
  }

  private async switchEthereumChain(chainId: number) {
    const res = await this.legacyRelay.switchEthereumChain(
      chainId.toString(10),
      this._accounts[0] || undefined
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
      this.updateListener.onChainChanged(this, {
        id: chainId,
        rpcUrl: switchResponse.rpcUrl,
      });
    }
  }
}
