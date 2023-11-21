import { AddressString, HexString, ProviderType } from '../core/type';
import { ScopedLocalStorage } from '../lib/ScopedLocalStorage';
import { RelayAbstract } from '../relay/RelayAbstract';
import { Session } from '../relay/Session';
import { Web3Method as SupportedWeb3Method, Web3Method } from '../relay/walletlink/type/Web3Method';
import { Web3Response } from '../relay/walletlink/type/Web3Response';
import { MOCK_ADDERESS, MOCK_TX } from './fixtures';

function makeMockReturn<T extends SupportedWeb3Method>(response: Web3Response<T>) {
  return { cancel: () => {}, promise: Promise.resolve<Web3Response<T>>(response) };
}

export class MockRelayClass extends RelayAbstract {
  constructor() {
    super();
    this.requestEthereumAccounts = this.requestEthereumAccounts.bind(this);
  }

  resetAndReload(): void {}

  requestEthereumAccounts() {
    return makeMockReturn({
      method: 'requestEthereumAccounts',
      result: [AddressString(MOCK_ADDERESS)],
    });
  }

  addEthereumChain() {
    return makeMockReturn({
      method: 'addEthereumChain',
      result: {
        isApproved: true,
        rpcUrl: 'https://node.ethchain.com',
      },
    });
  }

  watchAsset() {
    return makeMockReturn({
      method: 'watchAsset',
      result: true,
    });
  }

  selectProvider() {
    return makeMockReturn({
      method: 'selectProvider',
      result: ProviderType.CoinbaseWallet,
    });
  }

  switchEthereumChain() {
    return makeMockReturn({
      method: 'switchEthereumChain',
      result: {
        isApproved: true,
        rpcUrl: 'https://node.ethchain.com',
      },
    });
  }

  signEthereumMessage() {
    return makeMockReturn({
      method: 'signEthereumMessage',
      result: HexString('0x'),
    });
  }

  ethereumAddressFromSignedMessage() {
    return makeMockReturn({
      method: 'ethereumAddressFromSignedMessage',
      result: AddressString(MOCK_ADDERESS),
    });
  }

  signEthereumTransaction() {
    return makeMockReturn({
      method: 'signEthereumTransaction',
      result: HexString(MOCK_TX),
    });
  }

  signAndSubmitEthereumTransaction() {
    return makeMockReturn({
      method: 'submitEthereumTransaction',
      result: HexString(MOCK_TX),
    });
  }

  submitEthereumTransaction() {
    return makeMockReturn({
      method: 'submitEthereumTransaction',
      result: HexString(MOCK_TX),
    });
  }

  scanQRCode() {
    return makeMockReturn({
      method: 'scanQRCode',
      result: 'Success',
    });
  }

  genericRequest() {
    return makeMockReturn({
      method: 'generic',
      result: 'Success',
    });
  }

  sendRequest<_, T extends Web3Method>() {
    return { cancel: () => {}, promise: Promise.reject<Web3Response<T>>() };
  }

  setAppInfo() {
    return;
  }

  inlineAddEthereumChain() {
    return false;
  }

  setAccountsCallback(): void {
    return;
  }

  setChainCallback(): void {
    return;
  }

  setDappDefaultChainCallback(): void {
    return;
  }

  get session() {
    return new Session(new ScopedLocalStorage('session-test'));
  }
}
