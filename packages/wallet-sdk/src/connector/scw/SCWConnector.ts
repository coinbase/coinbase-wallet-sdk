import { standardErrorCodes, standardErrors } from '../../core/error';
import { SerializedEthereumRpcError } from '../../core/error/utils';
import { AddressString } from '../../core/type';
import { ensureIntNumber } from '../../core/util';
import { ScopedLocalStorage } from '../../lib/ScopedLocalStorage';
import { RequestArguments } from '../../provider/ProviderInterface';
import { PopUpCommunicator } from '../../transport/PopUpCommunicator';
import { LIB_VERSION } from '../../version';
import { Connector, ConnectorUpdateListener } from '../ConnectorInterface';
import { ChainManager } from './ChainManager';
import { exportKeyToHexString, importKeyFromHexString } from './protocol/key/Cipher';
import { KeyStorage } from './protocol/key/KeyStorage';
import {
  decryptContent,
  encryptContent,
  SCWRequestMessage,
  SCWResponseMessage,
} from './protocol/SCWMessage';
import {
  Action,
  SupportedEthereumMethods,
  SwitchEthereumChainAction,
} from './protocol/type/Action';
import { SCWResponse } from './protocol/type/Response';

export class SCWConnector implements Connector {
  private appName: string;
  private appLogoUrl: string | null;
  private appChainIds: number[];

  private puc: PopUpCommunicator;
  private storage: ScopedLocalStorage;
  private keyStorage: KeyStorage;
  private chainManager: ChainManager;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    appChainIds: number[];
    puc: PopUpCommunicator;
    storage: ScopedLocalStorage;
    updateListener: ConnectorUpdateListener;
  }) {
    this.appName = options.appName;
    this.appLogoUrl = options.appLogoUrl;
    this.appChainIds = options.appChainIds;
    this.puc = options.puc;
    this.storage = options.storage;
    this.keyStorage = new KeyStorage(this.storage);
    this.chainManager = new ChainManager(this.storage, (chain) =>
      options.updateListener.onChainChanged(this, chain)
    );

    this.handshake = this.handshake.bind(this);
    this.request = this.request.bind(this);
    this.createRequestMessage = this.createRequestMessage.bind(this);
    this.decryptResponseMessage = this.decryptResponseMessage.bind(this);
  }

  public async handshake(): Promise<AddressString[]> {
    if (!this.puc.connected) {
      await this.puc.connect();
    }

    const handshakeMessage = await this.createRequestMessage({
      handshake: {
        method: SupportedEthereumMethods.EthRequestAccounts,
        params: {
          dappName: this.appName,
          dappLogoUrl: this.appLogoUrl,
          chainIds: this.appChainIds,
        },
      },
    });
    const response = (await this.puc.request(handshakeMessage)) as SCWResponseMessage;

    // store peer's public key
    if ('failure' in response.content) throw response.content.failure;
    const peerPublicKey = await importKeyFromHexString('public', response.sender);
    await this.keyStorage.setPeerPublicKey(peerPublicKey);

    const decrypted = await this.decryptResponseMessage<AddressString[]>(response);
    this.updateInternalState({ method: SupportedEthereumMethods.EthRequestAccounts }, decrypted);

    const result = decrypted.result;
    if ('error' in result) throw result.error;
    return result.value;
  }

  public async request<T>(request: RequestArguments): Promise<T> {
    const localResult = this.tryLocalHandling<T>(request);
    if (localResult !== undefined) {
      if (localResult instanceof Error) throw localResult;
      return localResult;
    }

    const response = await this.sendEncryptedRequest(request);

    try {
      const decrypted = await this.decryptResponseMessage<T>(response);
      this.updateInternalState(request, decrypted);

      const result = decrypted.result;
      if ('error' in result) throw result.error;

      return result.value;
    } catch (err) {
      if ((err as SerializedEthereumRpcError).code === standardErrorCodes.provider.unauthorized) {
        await this.keyStorage.resetKeys();
      }
      throw err;
    }
  }

  disconnect() {
    // TODO: implement
  }

  private tryLocalHandling<T>(request: RequestArguments): T | undefined {
    switch (request.method) {
      case SupportedEthereumMethods.WalletSwitchEthereumChain: {
        const params = request.params as SwitchEthereumChainAction['params'];
        if (!params || !params[0]?.chainId) {
          throw standardErrors.rpc.invalidParams();
        }
        const chainId = ensureIntNumber(params[0].chainId);
        const switched = this.chainManager.switchChain(chainId);
        // "return null if the request was successful"
        // https://eips.ethereum.org/EIPS/eip-3326#wallet_switchethereumchain
        return switched ? (null as T) : undefined;
      }
      default:
        return undefined;
    }
  }

  private async sendEncryptedRequest(request: RequestArguments): Promise<SCWResponseMessage> {
    if (!this.puc.connected) {
      await this.puc.connect();
    }

    const sharedSecret = await this.keyStorage.getSharedSecret();
    if (!sharedSecret) {
      throw standardErrors.provider.unauthorized(
        'No valid session found, try requestAccounts before other methods'
      );
    }

    const encrypted = await encryptContent(
      {
        action: request as Action,
        chainId: this.chainManager.activeChain.id,
      },
      sharedSecret
    );
    const message = await this.createRequestMessage({ encrypted });

    const response = (await this.puc.request(message)) as SCWResponseMessage;
    return response;
  }

  private async createRequestMessage(
    content: SCWRequestMessage['content']
  ): Promise<SCWRequestMessage> {
    const publicKey = await exportKeyToHexString('public', await this.keyStorage.getOwnPublicKey());
    return {
      type: 'scw',
      id: crypto.randomUUID(),
      sender: publicKey,
      content,
      version: LIB_VERSION,
      timestamp: new Date(),
    };
  }

  private async decryptResponseMessage<T>(message: SCWResponseMessage): Promise<SCWResponse<T>> {
    const content = message.content;

    // throw protocol level error
    if ('failure' in content) {
      throw content.failure;
    }

    const sharedSecret = await this.keyStorage.getSharedSecret();
    if (!sharedSecret) {
      throw standardErrors.provider.unauthorized('Invalid session');
    }

    return decryptContent(content.encrypted, sharedSecret);
  }

  private updateInternalState<T>(request: RequestArguments, response: SCWResponse<T>) {
    switch (request.method) {
      case SupportedEthereumMethods.EthRequestAccounts:
      case SupportedEthereumMethods.WalletAddEthereumChain:
        this.chainManager.updateAvailableChains(response.data?.chains);
        break;
      case SupportedEthereumMethods.WalletSwitchEthereumChain: {
        this.chainManager.updateAvailableChains(response.data?.chains);

        const result = response.result;
        if ('error' in result) return;
        // "return null if the request was successful"
        // https://eips.ethereum.org/EIPS/eip-3326#wallet_switchethereumchain
        if (result.value !== null) return;

        const params = request.params as SwitchEthereumChainAction['params'];
        const chainId = ensureIntNumber(params[0].chainId);
        this.chainManager.switchChain(chainId);
        break;
      }
      default:
        break;
    }
  }
}
