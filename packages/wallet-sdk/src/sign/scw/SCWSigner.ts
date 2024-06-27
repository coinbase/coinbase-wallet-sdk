import { StateUpdateListener } from '../interface';
import { SCWKeyManager } from './SCWKeyManager';
import { Communicator } from ':core/communicator/Communicator';
import { standardErrors } from ':core/error';
import { RPCRequestMessage, RPCResponse, RPCResponseMessage } from ':core/message';
import { AppMetadata, RequestArguments, Signer } from ':core/provider/interface';
import { Method } from ':core/provider/method';
import { AddressString, Chain } from ':core/type';
import { ensureIntNumber } from ':core/type/util';
import {
  decryptContent,
  encryptContent,
  exportKeyToHexString,
  importKeyFromHexString,
} from ':util/cipher';
import { ScopedLocalStorage } from ':util/ScopedLocalStorage';

const ACCOUNTS_KEY = 'accounts';
const ACTIVE_CHAIN_STORAGE_KEY = 'activeChain';
const AVAILABLE_CHAINS_STORAGE_KEY = 'availableChains';
const WALLET_CAPABILITIES_STORAGE_KEY = 'walletCapabilities';

type SwitchEthereumChainParam = [
  {
    chainId: `0x${string}`; // Hex chain id
  },
];

export class SCWSigner implements Signer {
  private readonly metadata: AppMetadata;
  private readonly communicator: Communicator;
  private readonly keyManager: SCWKeyManager;
  private readonly storage = new ScopedLocalStorage('CBWSDK', 'SCWStateManager');
  private readonly updateListener: StateUpdateListener;

  private availableChains?: Chain[];
  private _accounts: AddressString[];
  private _activeChain: Chain;
  get accounts() {
    return this._accounts;
  }
  get activeChain() {
    return this._activeChain;
  }

  constructor(params: {
    metadata: AppMetadata;
    communicator: Communicator;
    updateListener: StateUpdateListener;
  }) {
    this.metadata = params.metadata;
    this.communicator = params.communicator;
    this.keyManager = new SCWKeyManager();
    this.updateListener = params.updateListener;

    this._accounts = this.storage.loadObject(ACCOUNTS_KEY) ?? [];
    this._activeChain = this.storage.loadObject(ACTIVE_CHAIN_STORAGE_KEY) || {
      id: params.metadata.appChainIds?.[0] ?? 1,
    };

    this.handshake = this.handshake.bind(this);
    this.request = this.request.bind(this);
    this.createRequestMessage = this.createRequestMessage.bind(this);
    this.decryptResponseMessage = this.decryptResponseMessage.bind(this);
  }

  async handshake(): Promise<AddressString[]> {
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

    const decrypted = await this.decryptResponseMessage<AddressString[]>(response);
    this.updateInternalState({ method: 'eth_requestAccounts' }, decrypted);

    const result = decrypted.result;
    if ('error' in result) throw result.error;

    return this._accounts;
  }

  async request<T>(request: RequestArguments): Promise<T> {
    const localResult = this.tryLocalHandling<T>(request);
    if (localResult !== undefined) {
      if (localResult instanceof Error) throw localResult;
      return localResult;
    }

    // Open the popup before constructing the request message.
    // This is to ensure that the popup is not blocked by some browsers (i.e. Safari)
    await this.communicator.waitForPopupLoaded();

    const response = await this.sendEncryptedRequest(request);
    const decrypted = await this.decryptResponseMessage<T>(response);
    this.updateInternalState(request, decrypted);

    const result = decrypted.result;
    if ('error' in result) throw result.error;

    return result.value;
  }

  async disconnect() {
    this.storage.clear();
    await this.keyManager.clear();
  }

  private tryLocalHandling<T>(request: RequestArguments): T | undefined {
    switch (request.method as Method) {
      case 'wallet_switchEthereumChain': {
        const params = request.params as SwitchEthereumChainParam;
        if (!params || !params[0]?.chainId) {
          throw standardErrors.rpc.invalidParams();
        }
        const chainId = ensureIntNumber(params[0].chainId);
        const switched = this.switchChain(chainId);
        // "return null if the request was successful"
        // https://eips.ethereum.org/EIPS/eip-3326#wallet_switchethereumchain
        return switched ? (null as T) : undefined;
      }
      case 'wallet_getCapabilities': {
        const walletCapabilities = this.storage.loadObject(WALLET_CAPABILITIES_STORAGE_KEY);
        if (!walletCapabilities) {
          // This should never be the case for scw connections as capabilities are set during handshake
          throw standardErrors.provider.unauthorized(
            'No wallet capabilities found, please disconnect and reconnect'
          );
        }
        return walletCapabilities as T;
      }
      default:
        return undefined;
    }
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
        chainId: this._activeChain.id,
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

  private async decryptResponseMessage<T>(message: RPCResponseMessage): Promise<RPCResponse<T>> {
    const content = message.content;

    // throw protocol level error
    if ('failure' in content) {
      throw content.failure;
    }

    const sharedSecret = await this.keyManager.getSharedSecret();
    if (!sharedSecret) {
      throw standardErrors.provider.unauthorized('Invalid session');
    }

    return decryptContent(content.encrypted, sharedSecret);
  }

  private updateInternalState<T>(request: RequestArguments, response: RPCResponse<T>) {
    const rawChains = response.data?.chains;
    if (rawChains) {
      const chains = Object.entries(rawChains).map(([id, rpcUrl]) => ({ id: Number(id), rpcUrl }));
      this.availableChains = chains;
      this.storage.storeObject(AVAILABLE_CHAINS_STORAGE_KEY, chains);
      this.switchChain(this._activeChain.id);
    }

    const walletCapabilities = response.data?.capabilities;
    if (walletCapabilities) {
      this.storage.storeObject(WALLET_CAPABILITIES_STORAGE_KEY, walletCapabilities);
    }

    const result = response.result;
    if ('error' in result) return;

    switch (request.method as Method) {
      case 'eth_requestAccounts': {
        const accounts = result.value as AddressString[];
        this._accounts = accounts;
        this.storage.storeObject(ACCOUNTS_KEY, accounts);
        this.updateListener.onAccountsUpdate(accounts);
        break;
      }
      case 'wallet_switchEthereumChain': {
        // "return null if the request was successful"
        // https://eips.ethereum.org/EIPS/eip-3326#wallet_switchethereumchain
        if (result.value !== null) return;

        const params = request.params as SwitchEthereumChainParam;
        const chainId = ensureIntNumber(params[0].chainId);
        this.switchChain(chainId);
        break;
      }
      default:
        break;
    }
  }

  private switchChain(chainId: number): boolean {
    const chain = this.availableChains?.find((chain) => chain.id === chainId);
    if (!chain) return false;
    if (chain === this._activeChain) return true;

    this._activeChain = chain;
    this.storage.storeObject(ACTIVE_CHAIN_STORAGE_KEY, chain);
    this.updateListener.onChainUpdate(chain);
    return true;
  }
}
