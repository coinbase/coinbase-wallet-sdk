import { CancelablePromise, RelayAbstract } from '../../RelayAbstract';
import { Session } from '../../Session';
import { EthereumTransactionParams } from '../../walletlink/type/EthereumTransactionParams';
import { SupportedWeb3Method, Web3Request } from '../../walletlink/type/Web3Request';
import { Web3Response } from '../../walletlink/type/Web3Response';
import { Action, SCWWeb3Request } from '../type/SCWWeb3Request';
import { PopUpCommunicator } from './PopUpCommunicator';
import { AddressString, IntNumber, ProviderType, RegExpString } from ':wallet-sdk/src/core/type';

export class SCWRelay extends RelayAbstract {
  protected appName = '';
  protected appLogoUrl: string | null = null;

  private puc: PopUpCommunicator;

  constructor(options: { appName: string; appLogoUrl: string | null; puc: PopUpCommunicator }) {
    super();
    this.appName = options.appName;
    this.appLogoUrl = options.appLogoUrl;
    this.puc = options.puc;
  }

  resetAndReload(): void {
    throw new Error('Method not implemented.');
  }
  requestEthereumAccounts(): CancelablePromise<Web3Response<'requestEthereumAccounts'>> {
    const request: Action<'requestEthereumAccounts'> = {
      method: 'requestEthereumAccounts',
      params: {
        appName: this.appName,
        appLogoUrl: this.appLogoUrl,
      },
    };

    return this.sendRequest(request);
  }
  addEthereumChain(
    _chainId: string,
    _rpcUrls: string[],
    _iconUrls: string[],
    _blockExplorerUrls: string[],
    _chainName: string,
    _nativeCurrency: { name: string; symbol: string; decimals: number }
  ): CancelablePromise<Web3Response<'addEthereumChain'>> {
    throw new Error('Method not implemented.');
  }
  watchAsset(
    _type: string,
    _address: string,
    _symbol?: string | undefined,
    _decimals?: number | undefined,
    _image?: string | undefined,
    _chainId?: string | undefined
  ): CancelablePromise<Web3Response<'watchAsset'>> {
    throw new Error('Method not implemented.');
  }
  selectProvider(
    _providerOptions: ProviderType[]
  ): CancelablePromise<Web3Response<'selectProvider'>> {
    throw new Error('Method not implemented.');
  }
  switchEthereumChain(
    _chainId: string,
    _address?: string | undefined
  ): CancelablePromise<Web3Response<'switchEthereumChain'>> {
    throw new Error('Method not implemented.');
  }
  signEthereumMessage(
    _message: Buffer,
    _address: AddressString,
    _addPrefix: boolean,
    _typedDataJson?: string | null | undefined
  ): CancelablePromise<Web3Response<'signEthereumMessage'>> {
    throw new Error('Method not implemented.');
  }
  ethereumAddressFromSignedMessage(
    _message: Buffer,
    _signature: Buffer,
    _addPrefix: boolean
  ): CancelablePromise<Web3Response<'ethereumAddressFromSignedMessage'>> {
    throw new Error('Method not implemented.');
  }
  signEthereumTransaction(
    _params: EthereumTransactionParams
  ): CancelablePromise<Web3Response<'signEthereumTransaction'>> {
    throw new Error('Method not implemented.');
  }
  signAndSubmitEthereumTransaction(
    _params: EthereumTransactionParams
  ): CancelablePromise<Web3Response<'submitEthereumTransaction'>> {
    throw new Error('Method not implemented.');
  }
  submitEthereumTransaction(
    _signedTransaction: Buffer,
    _chainId: IntNumber
  ): CancelablePromise<Web3Response<'submitEthereumTransaction'>> {
    throw new Error('Method not implemented.');
  }
  scanQRCode(__regExp: RegExpString): CancelablePromise<Web3Response<'scanQRCode'>> {
    throw new Error('Method not implemented.');
  }
  genericRequest(_data: object, _action: string): CancelablePromise<Web3Response<'generic'>> {
    throw new Error('Method not implemented.');
  }
  sendRequest<
    RequestMethod extends SupportedWeb3Method,
    ResponseMethod extends SupportedWeb3Method = RequestMethod,
  >(request: Web3Request<RequestMethod>): CancelablePromise<Web3Response<ResponseMethod>> {
    const scwWeb3Request: SCWWeb3Request = {
      uuid: crypto.randomUUID(),
      timestamp: Date.now(),
      actions: [request as Action],
    };

    const promise = this.puc
      .request(scwWeb3Request)
      .then(
        (responseEnvelope) =>
          responseEnvelope.response.actionResponses[0] as Web3Response<ResponseMethod>
      );

    return { promise, cancel: () => {} };
  }
  setAppInfo(appName: string, appLogoUrl: string | null): void {
    this.appName = appName;
    this.appLogoUrl = appLogoUrl;
  }
  setAccountsCallback(
    _accountsCallback: (accounts: string[], isDisconnect?: boolean | undefined) => void
  ): void {
    throw new Error('Method not implemented.');
  }
  setChainCallback(_chainIdCallback: (chainId: string, jsonRpcUrl: string) => void): void {
    throw new Error('Method not implemented.');
  }
  setDappDefaultChainCallback(_chainId: number): void {
    throw new Error('Method not implemented.');
  }
  inlineAddEthereumChain(_chainId: string): boolean {
    throw new Error('Method not implemented.');
  }
  get session(): Session {
    throw new Error('Method not implemented.');
  }
}
