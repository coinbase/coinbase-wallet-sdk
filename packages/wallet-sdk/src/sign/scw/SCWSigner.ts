import { StateUpdateListener } from '../interface';
import { Signer } from '../SignerInterface';
import { SCWKeyManager } from './SCWKeyManager';
import { SCWStateManager } from './SCWStateManager';
import { PopUpCommunicator } from ':core/communicator/PopUpCommunicator';
import { standardErrors } from ':core/error';
import { createMessage } from ':core/message';
import { Action, SupportedEthereumMethods, SwitchEthereumChainAction } from ':core/message/Action';
import {
  decryptContent,
  encryptContent,
  exportKeyToHexString,
  importKeyFromHexString,
} from ':core/message/Cipher';
import { RPCRequestMessage, RPCResponseMessage } from ':core/message/RPCMessage';
import { RPCResponse } from ':core/message/RPCResponse';
import { AddressString } from ':core/type';
import { AppMetadata, RequestArguments } from ':core/type/ProviderInterface';
import { ensureIntNumber } from ':core/util';

export class SCWSigner implements Signer {
  private metadata: AppMetadata;
  private puc: PopUpCommunicator;
  private keyManager: SCWKeyManager;
  private stateManager: SCWStateManager;

  constructor(options: {
    metadata: AppMetadata;
    puc: PopUpCommunicator;
    updateListener: StateUpdateListener;
  }) {
    this.metadata = options.metadata;
    this.puc = options.puc;
    this.keyManager = new SCWKeyManager();
    this.stateManager = new SCWStateManager({
      appChainIds: this.metadata.appChainIds,
      updateListener: options.updateListener,
    });

    this.handshake = this.handshake.bind(this);
    this.request = this.request.bind(this);
    this.createRequestMessage = this.createRequestMessage.bind(this);
    this.decryptResponseMessage = this.decryptResponseMessage.bind(this);
  }

  public async handshake(): Promise<AddressString[]> {
    await this.puc.connect();

    const handshakeMessage = await this.createRequestMessage({
      handshake: {
        method: SupportedEthereumMethods.EthRequestAccounts,
        params: this.metadata,
      },
    });
    const response = (await this.puc.postMessageForResponse(
      handshakeMessage
    )) as RPCResponseMessage;

    // store peer's public key
    if ('failure' in response.content) throw response.content.failure;
    const peerPublicKey = await importKeyFromHexString('public', response.sender);
    await this.keyManager.setPeerPublicKey(peerPublicKey);

    const decrypted = await this.decryptResponseMessage<AddressString[]>(response);
    this.updateInternalState({ method: SupportedEthereumMethods.EthRequestAccounts }, decrypted);

    const result = decrypted.result;
    if ('error' in result) throw result.error;

    return this.stateManager.accounts;
  }

  public async request<T>(request: RequestArguments): Promise<T> {
    const localResult = this.tryLocalHandling<T>(request);
    if (localResult !== undefined) {
      if (localResult instanceof Error) throw localResult;
      return localResult;
    }

    await this.puc.connect();
    const response = await this.sendEncryptedRequest(request);
    const decrypted = await this.decryptResponseMessage<T>(response);
    this.updateInternalState(request, decrypted);

    const result = decrypted.result;
    if ('error' in result) throw result.error;

    return result.value;
  }

  async disconnect() {
    this.stateManager.clear();
    await this.keyManager.clear();
  }

  private tryLocalHandling<T>(request: RequestArguments): T | undefined {
    switch (request.method) {
      case SupportedEthereumMethods.WalletSwitchEthereumChain: {
        const params = request.params as SwitchEthereumChainAction['params'];
        if (!params || !params[0]?.chainId) {
          throw standardErrors.rpc.invalidParams();
        }
        const chainId = ensureIntNumber(params[0].chainId);
        const switched = this.stateManager.switchChain(chainId);
        // "return null if the request was successful"
        // https://eips.ethereum.org/EIPS/eip-3326#wallet_switchethereumchain
        return switched ? (null as T) : undefined;
      }
      case SupportedEthereumMethods.WalletGetCapabilities: {
        const walletCapabilities = this.stateManager.walletCapabilities;
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
        action: request as Action,
        chainId: this.stateManager.activeChain.id,
      },
      sharedSecret
    );
    const message = await this.createRequestMessage({ encrypted });

    const response = (await this.puc.postMessageForResponse(message)) as RPCResponseMessage;
    return response;
  }

  private async createRequestMessage(
    content: RPCRequestMessage['content']
  ): Promise<RPCRequestMessage> {
    const publicKey = await exportKeyToHexString('public', await this.keyManager.getOwnPublicKey());
    return createMessage<RPCRequestMessage>({
      sender: publicKey,
      content,
      timestamp: new Date(),
    });
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
    const availableChains = response.data?.chains;
    if (availableChains) {
      this.stateManager.updateAvailableChains(availableChains);
    }

    const walletCapabilities = response.data?.capabilities;
    if (walletCapabilities) {
      this.stateManager.updateWalletCapabilities(walletCapabilities);
    }

    const result = response.result;
    if ('error' in result) return;

    switch (request.method) {
      case SupportedEthereumMethods.EthRequestAccounts: {
        const accounts = result.value as AddressString[];
        this.stateManager.updateAccounts(accounts);
        break;
      }
      case SupportedEthereumMethods.WalletSwitchEthereumChain: {
        // "return null if the request was successful"
        // https://eips.ethereum.org/EIPS/eip-3326#wallet_switchethereumchain
        if (result.value !== null) return;

        const params = request.params as SwitchEthereumChainAction['params'];
        const chainId = ensureIntNumber(params[0].chainId);
        this.stateManager.switchChain(chainId);
        break;
      }
      default:
        break;
    }
  }
}
