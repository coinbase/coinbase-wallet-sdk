import { Web3Response } from '../type/Web3Response.js';
import { WalletLinkRelay } from '../WalletLinkRelay.js';
import { MOCK_ADDERESS, MOCK_TX } from './fixtures.js';
import { HexString } from ':core/type/index.js';

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
      result: [MOCK_ADDERESS],
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
