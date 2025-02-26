import { numberToHex } from 'viem';

import { Signer } from '../interface.js';
import { SCWKeyManager } from './SCWKeyManager.js';
import { addSenderToRequest, assertParamsChainId, getSenderFromRequest } from './utils.js';
import { createSubAccountSigner } from './utils/createSubAccountSigner.js';
import { Communicator } from ':core/communicator/Communicator.js';
import { standardErrors } from ':core/error/errors.js';
import { RPCRequestMessage, RPCResponseMessage } from ':core/message/RPCMessage.js';
import { RPCResponse } from ':core/message/RPCResponse.js';
import { AppMetadata, ProviderEventCallback, RequestArguments } from ':core/provider/interface.js';
import { WalletConnectResponse } from ':core/rpc/wallet_connect.js';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';
import { Address } from ':core/type/index.js';
import { ensureIntNumber, hexStringFromNumber } from ':core/type/util.js';
import { createClients, SDKChain } from ':stores/chain-clients/utils.js';
import { subaccounts } from ':stores/sub-accounts/store.js';
import { assertSubAccountInfo } from ':stores/sub-accounts/utils.js';
import { assertPresence } from ':util/assertPresence.js';
import {
  decryptContent,
  encryptContent,
  exportKeyToHexString,
  importKeyFromHexString,
} from ':util/cipher.js';
import { get } from ':util/get.js';
import { fetchRPCRequest } from ':util/provider.js';

const ACCOUNTS_KEY = 'accounts';
const ACTIVE_CHAIN_STORAGE_KEY = 'activeChain';
const AVAILABLE_CHAINS_STORAGE_KEY = 'availableChains';
const WALLET_CAPABILITIES_STORAGE_KEY = 'walletCapabilities';

type Chain = {
  id: number;
  rpcUrl?: string;
};

type ConstructorOptions = {
  metadata: AppMetadata;
  communicator: Communicator;
  callback: ProviderEventCallback | null;
};

export class SCWSigner implements Signer {
  private readonly metadata: AppMetadata;
  private readonly communicator: Communicator;
  private readonly keyManager: SCWKeyManager;
  private readonly storage: ScopedLocalStorage;
  private callback: ProviderEventCallback | null;

  private accounts: Address[];
  private chain: Chain;

  constructor(params: ConstructorOptions) {
    this.metadata = params.metadata;
    this.communicator = params.communicator;
    this.callback = params.callback;
    this.keyManager = new SCWKeyManager();
    this.storage = new ScopedLocalStorage('CBWSDK', 'SCWStateManager');

    this.accounts = this.storage.loadObject(ACCOUNTS_KEY) ?? [];
    this.chain = this.storage.loadObject(ACTIVE_CHAIN_STORAGE_KEY) || {
      id: params.metadata.appChainIds?.[0] ?? 1,
    };

    this.handshake = this.handshake.bind(this);
    this.request = this.request.bind(this);
    this.createRequestMessage = this.createRequestMessage.bind(this);
    this.decryptResponseMessage = this.decryptResponseMessage.bind(this);

    // rehydrate the sub account store
    subaccounts.persist.rehydrate(); // should this be called inside the createCoinbaseWalletSDK?

    const chains = this.storage.loadObject<SDKChain[]>(AVAILABLE_CHAINS_STORAGE_KEY);
    if (chains) {
      createClients(chains);
    }
  }

  async handshake(args: RequestArguments) {
    // Open the popup before constructing the request message.
    // This is to ensure that the popup is not blocked by some browsers (i.e. Safari)
    await this.communicator.waitForPopupLoaded?.();

    const handshakeMessage = await this.createRequestMessage({
      handshake: {
        method: args.method,
        params: args.params ?? [],
      },
    });
    const response: RPCResponseMessage =
      await this.communicator.postRequestAndWaitForResponse(handshakeMessage);

    // store peer's public key
    if ('failure' in response.content) throw response.content.failure;
    const peerPublicKey = await importKeyFromHexString('public', response.sender);
    await this.keyManager.setPeerPublicKey(peerPublicKey);

    const decrypted = await this.decryptResponseMessage(response);

    this.handleResponse(args, decrypted);
  }

  async request(request: RequestArguments) {
    if (this.accounts.length === 0) {
      switch (request.method) {
        case 'wallet_switchEthereumChain': {
          assertParamsChainId(request.params);
          return (this.chain.id = Number(request.params[0].chainId));
        }
        case 'wallet_connect':
        case 'wallet_sendCalls':
          return this.sendRequestToPopup(request);
        default:
          throw standardErrors.provider.unauthorized();
      }
    }

    if (this.shouldRequestUseSubAccountSigner(request)) {
      return this.sendRequestToSubAccountSigner(request);
    }

    switch (request.method) {
      case 'eth_requestAccounts':
        this.callback?.('connect', { chainId: numberToHex(this.chain.id) });
        return this.accounts;
      case 'eth_accounts':
        return this.accounts;
      case 'eth_coinbase':
        return this.accounts[0];
      case 'net_version':
        return this.chain.id;
      case 'eth_chainId':
        return numberToHex(this.chain.id);
      case 'wallet_getCapabilities':
        return this.storage.loadObject(WALLET_CAPABILITIES_STORAGE_KEY);
      case 'wallet_switchEthereumChain':
        return this.handleSwitchChainRequest(request);
      case 'eth_ecRecover':
      case 'personal_sign':
      case 'wallet_sign':
      case 'personal_ecRecover':
      case 'eth_signTransaction':
      case 'eth_sendTransaction':
      case 'eth_signTypedData_v1':
      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
      case 'eth_signTypedData':
      case 'wallet_addEthereumChain':
      case 'wallet_watchAsset':
      case 'wallet_sendCalls':
      case 'wallet_showCallsStatus':
      case 'wallet_grantPermissions':
      case 'wallet_connect':
        return this.sendRequestToPopup(request);
      // Sub Account Support
      case 'wallet_addSubAccount':
        return this.addSubAccount(request);
      default:
        if (!this.chain.rpcUrl) {
          throw standardErrors.rpc.internal('No RPC URL set for chain');
        }
        return fetchRPCRequest(request, this.chain.rpcUrl);
    }
  }

  private async sendRequestToPopup(request: RequestArguments) {
    // Open the popup before constructing the request message.
    // This is to ensure that the popup is not blocked by some browsers (i.e. Safari)
    await this.communicator.waitForPopupLoaded?.();

    const response = await this.sendEncryptedRequest(request);
    const decrypted = await this.decryptResponseMessage(response);

    return this.handleResponse(request, decrypted);
  }

  private async handleResponse(request: RequestArguments, decrypted: RPCResponse) {
    const result = decrypted.result;

    if ('error' in result) throw result.error;

    switch (request.method) {
      case 'eth_requestAccounts': {
        const accounts = result.value as Address[];
        this.accounts = accounts;
        this.storage.storeObject(ACCOUNTS_KEY, accounts);
        this.callback?.('accountsChanged', accounts);
        break;
      }
      case 'wallet_connect': {
        const response = result.value as WalletConnectResponse;
        const accounts = response.accounts.map((account) => account.address);
        this.accounts = accounts;
        this.storage.storeObject(ACCOUNTS_KEY, accounts);

        // TODO: in future PR update state to support multiple accounts
        const account = response.accounts.at(0);
        const capabilities = account?.capabilities;
        if (capabilities?.addSubAccount || capabilities?.getSubAccounts) {
          const capabilityResponse =
            capabilities?.addSubAccount ?? capabilities?.getSubAccounts?.[0];
          assertSubAccountInfo(capabilityResponse);
          subaccounts.setState({
            account: capabilityResponse,
            universalAccount: this.accounts[0],
          });
        }
        const accounts_ = [this.accounts[0]];
        const subaccount = subaccounts.getState().account;
        if (subaccount) {
          accounts_.push(subaccount.address);
        }
        this.callback?.('accountsChanged', accounts_);
        break;
      }
      default:
        break;
    }
    return result.value;
  }

  async cleanup() {
    this.storage.clear();
    await this.keyManager.clear();
    this.accounts = [];
    this.chain = {
      id: this.metadata.appChainIds?.[0] ?? 1,
    };
  }

  /**
   * @returns `null` if the request was successful.
   * https://eips.ethereum.org/EIPS/eip-3326#wallet_switchethereumchain
   */
  private async handleSwitchChainRequest(request: RequestArguments) {
    assertParamsChainId(request.params);

    const chainId = ensureIntNumber(request.params[0].chainId);
    const localResult = this.updateChain(chainId);
    if (localResult) return null;

    const popupResult = await this.sendRequestToPopup(request);
    if (popupResult === null) {
      this.updateChain(chainId);
    }
    return popupResult;
  }

  private async sendEncryptedRequest(request: RequestArguments): Promise<RPCResponseMessage> {
    const sharedSecret = await this.keyManager.getSharedSecret();
    if (!sharedSecret) {
      throw standardErrors.provider.unauthorized(
        'No valid session found, try requestAccounts before other methods'
      );
    }

    const encrypted = await encryptContent(
      {
        action: request,
        chainId: this.chain.id,
      },
      sharedSecret
    );
    const message = await this.createRequestMessage({ encrypted });

    return this.communicator.postRequestAndWaitForResponse(message);
  }

  private async createRequestMessage(
    content: RPCRequestMessage['content']
  ): Promise<RPCRequestMessage> {
    const publicKey = await exportKeyToHexString('public', await this.keyManager.getOwnPublicKey());
    return {
      id: crypto.randomUUID(),
      sender: publicKey,
      content,
      timestamp: new Date(),
    };
  }

  private async decryptResponseMessage(message: RPCResponseMessage): Promise<RPCResponse> {
    const content = message.content;

    // throw protocol level error
    if ('failure' in content) {
      throw content.failure;
    }

    const sharedSecret = await this.keyManager.getSharedSecret();
    if (!sharedSecret) {
      throw standardErrors.provider.unauthorized('Invalid session');
    }

    const response: RPCResponse = await decryptContent(content.encrypted, sharedSecret);

    const availableChains = response.data?.chains;
    if (availableChains) {
      const nativeCurrencies = response.data?.nativeCurrencies;
      const chains: SDKChain[] = Object.entries(availableChains).map(([id, rpcUrl]) => {
        const nativeCurrency = nativeCurrencies?.[Number(id)];
        return {
          id: Number(id),
          rpcUrl,
          ...(nativeCurrency ? { nativeCurrency } : {}),
        };
      });
      this.storage.storeObject(AVAILABLE_CHAINS_STORAGE_KEY, chains);
      this.updateChain(this.chain.id, chains);
      // create clients for sub accounts
      createClients(chains);
    }

    const walletCapabilities = response.data?.capabilities;
    if (walletCapabilities) {
      this.storage.storeObject(WALLET_CAPABILITIES_STORAGE_KEY, walletCapabilities);
    }

    return response;
  }

  private updateChain(chainId: number, newAvailableChains?: Chain[]): boolean {
    const chains =
      newAvailableChains ?? this.storage.loadObject<Chain[]>(AVAILABLE_CHAINS_STORAGE_KEY);
    const chain = chains?.find((chain) => chain.id === chainId);
    if (!chain) return false;

    if (chain !== this.chain) {
      this.chain = chain;
      this.storage.storeObject(ACTIVE_CHAIN_STORAGE_KEY, chain);
      this.callback?.('chainChanged', hexStringFromNumber(chain.id));
    }
    return true;
  }

  private async addSubAccount(request: RequestArguments) {
    const state = subaccounts.getState();
    if (state.account) {
      this.callback?.('accountsChanged', [this.accounts[0], state.account.address]);
      return state.account;
    }

    await this.communicator.waitForPopupLoaded?.();
    const address = get(request, 'params[0].address') as string;
    if (address) {
      throw standardErrors.rpc.invalidParams('importing an address is not yet supported');
    }

    const response = await this.sendRequestToPopup(request);
    assertSubAccountInfo(response);
    // Only store the sub account information after the popup has been closed and the
    // user has confirmed the creation
    subaccounts.setState({
      account: response,
      universalAccount: this.accounts[0],
    });
    this.callback?.('accountsChanged', [this.accounts[0], response.address]);
    return response;
  }

  private shouldRequestUseSubAccountSigner(request: RequestArguments) {
    const sender = getSenderFromRequest(request);
    const state = subaccounts.getState();
    if (sender) {
      return sender === state.account?.address;
    }
    return false;
  }

  private async sendRequestToSubAccountSigner(request: RequestArguments) {
    const state = subaccounts.getState();
    assertPresence(state.account, standardErrors.provider.unauthorized('no active sub account'));

    const sender = getSenderFromRequest(request);
    // if sender is undefined, we inject the active sub account
    // address into the params for the supported request methods
    if (sender === undefined) {
      request = addSenderToRequest(request, state.account.address as Address);
    }

    const signer = await createSubAccountSigner({
      chainId: this.chain.id,
    });
    return signer.request(request);
  }
}
