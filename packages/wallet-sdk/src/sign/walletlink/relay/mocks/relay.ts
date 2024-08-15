import { Web3Response } from '../type/Web3Response';
import { WalletLinkRelay } from '../WalletLinkRelay';
import { MOCK_ADDERESS, MOCK_TX } from './fixtures';
import { AddressString, HexString } from ':core/type';

export function mockedWalletLinkRelay(): WalletLinkRelay {
  return mock as unknown as WalletLinkRelay;
}

function makeMockReturn(response: Web3Response) {
  return Promise.resolve<Web3Response>(response);
}

const mock = {
  resetAndReload(): void {},
  requestEthereumAccounts() {
    return makeMockReturn({
      method: 'requestEthereumAccounts',
      result: [AddressString(MOCK_ADDERESS)],
    });
  },
  addEthereumChain() {
    return makeMockReturn({
      method: 'addEthereumChain',
      result: {
        isApproved: true,
        rpcUrl: 'https://node.ethchain.com',
      },
    });
  },
  watchAsset() {
    return makeMockReturn({
      method: 'watchAsset',
      result: true,
    });
  },
  switchEthereumChain() {
    return makeMockReturn({
      method: 'switchEthereumChain',
      result: {
        isApproved: true,
        rpcUrl: 'https://node.ethchain.com',
      },
    });
  },
  signEthereumTransaction() {
    return makeMockReturn({
      method: 'signEthereumTransaction',
      result: HexString(MOCK_TX),
    });
  },
  signAndSubmitEthereumTransaction() {
    return makeMockReturn({
      method: 'submitEthereumTransaction',
      result: HexString(MOCK_TX),
    });
  },
  submitEthereumTransaction() {
    return makeMockReturn({
      method: 'submitEthereumTransaction',
      result: HexString(MOCK_TX),
    });
  },
  sendRequest() {
    return Promise.reject<Web3Response>();
  },
};
