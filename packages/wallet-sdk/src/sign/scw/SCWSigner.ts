import { Signer } from '../interface';
import { SCWKeyManager } from './SCWKeyManager';
import { Communicator } from ':core/communicator/Communicator';
import { standardErrors } from ':core/error';
import { RPCRequestMessage, RPCResponse, RPCResponseMessage } from ':core/message';
import { AppMetadata, ProviderEventCallback, RequestArguments } from ':core/provider/interface';
import { ScopedAsyncStorage } from ':core/storage/ScopedAsyncStorage';
import { AddressString } from ':core/type';
import { ensureIntNumber, hexStringFromNumber } from ':core/type/util';
import {
  decryptContent,
  encryptContent,
  exportKeyToHexString,
  importKeyFromHexString,
} from ':util/cipher';
import { fetchRPCRequest } from ':util/provider';
const ACCOUNTS_KEY = 'accounts';
const ACTIVE_CHAIN_STORAGE_KEY = 'activeChain';
const AVAILABLE_CHAINS_STORAGE_KEY = 'availableChains';
const WALLET_CAPABILITIES_STORAGE_KEY = 'walletCapabilities';
import { LIB_VERSION } from '../../version';
import { isPresigned } from './util';

type Chain = {
  id: number;
  rpcUrl?: string;
};

type ConstructorOptions = {
  metadata: AppMetadata;
  communicator: Communicator;
  callback: ProviderEventCallback | null;
};

const PERMISSIONS_BACKEND_URL = 'https://permissioned-keys.com'

export class SCWSigner implements Signer {
  private readonly metadata: AppMetadata;
  private readonly communicator: Communicator;
  private readonly keyManager: SCWKeyManager;
  private readonly storage: ScopedAsyncStorage;
  private callback: ProviderEventCallback | null;

  private accounts: AddressString[];
  private chain: Chain;

  private constructor(params: ConstructorOptions) {
    this.metadata = params.metadata;
    this.communicator = params.communicator;
    this.callback = params.callback;
    this.keyManager = new SCWKeyManager();
    this.storage = new ScopedAsyncStorage('CBWSDK', 'SCWStateManager');

    // default values
    this.accounts = [];
    this.chain = {
      id: params.metadata.appChainIds?.[0] ?? 1,
    };

    this.handshake = this.handshake.bind(this);
    this.request = this.request.bind(this);
    this.createRequestMessage = this.createRequestMessage.bind(this);
    this.decryptResponseMessage = this.decryptResponseMessage.bind(this);
  }

  private async initialize() {
    const storedAccounts = await this.storage.loadObject<AddressString[]>(ACCOUNTS_KEY);
    if (storedAccounts) {
      this.accounts = storedAccounts;
    }

    const storedChain = await this.storage.loadObject<Chain>(ACTIVE_CHAIN_STORAGE_KEY);
    if (storedChain) {
      this.chain = storedChain;
    }
  }

  static async createInstance(params: ConstructorOptions) {
    const instance = new SCWSigner(params);
    await instance.initialize();
    return instance;
  }

  async handshake() {
    const handshakeMessage = await this.createRequestMessage({
      handshake: {
        method: 'eth_requestAccounts',
        params: this.metadata,
      },
    });
    const response: RPCResponseMessage =
      await this.communicator.postRequestAndWaitForResponse(handshakeMessage);

    // store peer's public key
    if ('failure' in response.content) throw response.content.failure;
    const peerPublicKey = await importKeyFromHexString('public', response.sender);
    await this.keyManager.setPeerPublicKey(peerPublicKey);

    const decrypted = await this.decryptResponseMessage(response);

    const result = decrypted.result;
    if ('error' in result) throw result.error;

    const accounts = result.value as AddressString[];
    this.accounts = accounts;
    await this.storage.storeObject(ACCOUNTS_KEY, accounts);
    this.callback?.('accountsChanged', accounts);
  }

  async request(request: RequestArguments) {
    if (this.accounts.length === 0) {
      throw standardErrors.provider.unauthorized();
    }

    switch (request.method) {
      case 'eth_requestAccounts':
        this.callback?.('connect', { chainId: hexStringFromNumber(this.chain.id) });
        return this.accounts;
      case 'eth_accounts':
        return this.accounts;
      case 'eth_coinbase':
        return this.accounts[0];
      case 'net_version':
        return this.chain.id;
      case 'eth_chainId':
        return hexStringFromNumber(this.chain.id);
      case 'wallet_getCapabilities':
        return this.storage.loadObject(WALLET_CAPABILITIES_STORAGE_KEY);
      case 'wallet_switchEthereumChain':
        return this.handleSwitchChainRequest(request);
      case 'wallet_sendCalls':
        // Temporary solution for demo purposes
        if (isPresigned(request)) return fetchRPCRequest(request, PERMISSIONS_BACKEND_URL)
        return this.sendRequestToPopup(request);
      case 'eth_call':
      case 'eth_ecRecover':
      case 'personal_sign':
      case 'personal_ecRecover':
      case 'eth_signTransaction':
      case 'eth_sendTransaction':
      case 'eth_signTypedData_v1':
      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
      case 'eth_signTypedData':
      case 'wallet_addEthereumChain':
      case 'wallet_watchAsset':
      case 'wallet_showCallsStatus':
      case 'wallet_grantPermissions':
        return this.sendRequestToPopup(request);
      default:
        if (!this.chain.rpcUrl) throw standardErrors.rpc.internal('No RPC URL set for chain');
        return fetchRPCRequest(request, this.chain.rpcUrl);
    }
  }

  private async sendRequestToPopup(request: RequestArguments) {
    // [Web Only] Open the popup before constructing the request message.
    // This is to ensure that the popup is not blocked by some browsers (i.e. Safari)
    await this.communicator.waitForPopupLoaded?.();

    const response = await this.sendEncryptedRequest(request);
    const decrypted = await this.decryptResponseMessage(response);

    const result = decrypted.result;
    if ('error' in result) throw result.error;

    return result.value;
  }

  async cleanup() {
    await this.storage.clear();
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
    const params = request.params as [
      {
        chainId: `0x${string}`;
      },
    ];
    if (!params || !params[0]?.chainId) {
      throw standardErrors.rpc.invalidParams();
    }
    const chainId = ensureIntNumber(params[0].chainId);

    const localResult = await this.updateChain(chainId);
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
      sdkVersion: LIB_VERSION,
      timestamp: new Date(),
      ...(this.metadata.appDeeplinkUrl && { callbackUrl: this.metadata.appDeeplinkUrl }),
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
      const chains = Object.entries(availableChains).map(([id, rpcUrl]) => ({
        id: Number(id),
        rpcUrl,
      }));
      await this.storage.storeObject(AVAILABLE_CHAINS_STORAGE_KEY, chains);
      await this.updateChain(this.chain.id, chains);
    }

    const walletCapabilities = response.data?.capabilities;
    if (walletCapabilities) {
      await this.storage.storeObject(WALLET_CAPABILITIES_STORAGE_KEY, walletCapabilities);
    }

    return response;
  }

  private async updateChain(chainId: number, newAvailableChains?: Chain[]): Promise<boolean> {
    const chains =
      newAvailableChains ?? (await this.storage.loadObject<Chain[]>(AVAILABLE_CHAINS_STORAGE_KEY));
    const chain = chains?.find((chain) => chain.id === chainId);
    if (!chain) return false;

    if (chain !== this.chain) {
      this.chain = chain;
      await this.storage.storeObject(ACTIVE_CHAIN_STORAGE_KEY, chain);
      this.callback?.('chainChanged', hexStringFromNumber(chain.id));
    }
    return true;
  }
}
