import { LIB_VERSION } from '../../version';
import { Signer, SignerUpdateListener } from '../SignerInterface';
import {
  decryptContent,
  encryptContent,
  exportKeyToHexString,
  importKeyFromHexString,
} from './message/SCWCipher';
import { SCWRequestMessage, SCWResponseMessage } from './message/SCWMessage';
import { Action, SupportedEthereumMethods, SwitchEthereumChainAction } from './message/type/Action';
import { SCWResponse } from './message/type/Response';
import { SCWKeyManager } from './SCWKeyManager';
import { SCWStateManager } from './SCWStateManager';
import { PopUpCommunicator } from './transport/PopUpCommunicator';
import { CB_KEYS_BACKEND_URL } from ':core/constants';
import { standardErrors } from ':core/error';
import { AddressString } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';
import { ensureIntNumber } from ':core/util';
export class SCWSigner implements Signer {
  private appName: string;
  private appLogoUrl: string | null;
  private appChainIds: number[];

  private puc: PopUpCommunicator;
  private keyManager: SCWKeyManager;
  private stateManager: SCWStateManager;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    appChainIds: number[];
    puc: PopUpCommunicator;
    updateListener: SignerUpdateListener;
  }) {
    this.appName = options.appName;
    this.appLogoUrl = options.appLogoUrl;
    this.appChainIds = options.appChainIds;
    this.puc = options.puc;
    this.keyManager = new SCWKeyManager();
    this.stateManager = new SCWStateManager({
      appChainIds: this.appChainIds,
      updateListener: {
        onAccountsUpdate: (...args) => options.updateListener.onAccountsUpdate(this, ...args),
        onChainUpdate: (...args) => options.updateListener.onChainUpdate(this, ...args),
      },
    });

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

    const backendResult = await this.tryBackendHandling<T>(request);
    if (backendResult !== undefined) {
      return backendResult;
    }

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

  private async tryBackendHandling<T>(request: RequestArguments): Promise<T | undefined> {
    switch (request.method) {
      case SupportedEthereumMethods.WalletGetCallsStatus: {
        const requestBody = {
          ...request,
          jsonrpc: '2.0',
          id: crypto.randomUUID(),
        };
        const res = await window.fetch(CB_KEYS_BACKEND_URL, {
          method: 'POST',
          body: JSON.stringify(requestBody),
          mode: 'cors',
          headers: { 'Content-Type': 'application/json', 'X-Cbw-Sdk-Version': LIB_VERSION },
        });
        const response = await res.json();
        return response as T;
      }
      default:
        return undefined;
    }
  }

  private async sendEncryptedRequest(request: RequestArguments): Promise<SCWResponseMessage> {
    if (!this.puc.connected) {
      await this.puc.connect();
    }

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

    const response = (await this.puc.request(message)) as SCWResponseMessage;
    return response;
  }

  private async createRequestMessage(
    content: SCWRequestMessage['content']
  ): Promise<SCWRequestMessage> {
    const publicKey = await exportKeyToHexString('public', await this.keyManager.getOwnPublicKey());
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

    const sharedSecret = await this.keyManager.getSharedSecret();
    if (!sharedSecret) {
      throw standardErrors.provider.unauthorized('Invalid session');
    }

    return decryptContent(content.encrypted, sharedSecret);
  }

  private updateInternalState<T>(request: RequestArguments, response: SCWResponse<T>) {
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
