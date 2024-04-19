import { SignRequestHandlerListener } from './interface';
import { SCWSigner } from './scw/SCWSigner';
import { Signer } from './SignerInterface';
import { WLSigner } from './walletlink/WLSigner';
import { PopUpCommunicator } from ':core/communicator/PopUpCommunicator';
import { CB_KEYS_URL } from ':core/constants';
import { standardErrorCodes, standardErrors } from ':core/error';
import { createMessage } from ':core/message';
import {
  ConfigEvent,
  ConfigResponseMessage,
  ConfigUpdateMessage,
  SignerType,
} from ':core/message/ConfigMessage';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage';
import { AddressString } from ':core/type';
import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  RequestArguments,
} from ':core/type/ProviderInterface';
import { RequestHandler } from ':core/type/RequestHandlerInterface';

const SIGNER_TYPE_KEY = 'SignerType';

type SignRequestHandlerOptions = ConstructorOptions & {
  updateListener: SignRequestHandlerListener;
  keysUrl?: string;
};

export class SignRequestHandler implements RequestHandler {
  private _signer: Signer | undefined;

  private popupCommunicator: PopUpCommunicator;
  private updateListener: SignRequestHandlerListener;
  private metadata: AppMetadata;
  private preference: Preference;

  constructor(options: Readonly<SignRequestHandlerOptions>) {
    this.popupCommunicator = new PopUpCommunicator({
      url: options.keysUrl ?? CB_KEYS_URL,
    });
    this.updateListener = options.updateListener;
    this._signer = this.tryRestoringSignerFromPersistedType();
    this.metadata = options.metadata;
    this.preference = options.preference;
  }

  async handleRequest(request: RequestArguments, accounts: AddressString[]) {
    try {
      if (request.method === 'eth_requestAccounts') {
        return await this.eth_requestAccounts(accounts);
      }

      const signer = await this.useSigner();
      if (accounts.length <= 0) {
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      }

      return await signer.request(request);
    } catch (err) {
      if ((err as { code?: unknown })?.code === standardErrorCodes.provider.unauthorized) {
        this.updateListener.onResetConnection();
      }
      throw err;
    }
  }

  private async eth_requestAccounts(accounts: AddressString[]): Promise<AddressString[]> {
    if (accounts.length > 0) {
      this.updateListener.onConnect();
      return Promise.resolve(accounts);
    }

    try {
      const signer = await this.useSigner();
      const ethAddresses = await signer.handshake();
      if (Array.isArray(ethAddresses)) {
        if (signer instanceof WLSigner) {
          this.popupCommunicator.postMessage<ConfigUpdateMessage>({
            event: ConfigEvent.WalletLinkUpdate,
            data: {
              connected: true,
            },
          });
        }
        this.updateListener.onConnect();
        return Promise.resolve(ethAddresses);
      }

      return Promise.reject(standardErrors.rpc.internal('Failed to get accounts'));
    } catch (err) {
      if (this._signer instanceof WLSigner) {
        this.popupCommunicator.disconnect();
        await this.onDisconnect();
      }
      throw err;
    }
  }

  canHandleRequest(request: RequestArguments): boolean {
    const methodsThatRequireSigning = [
      'eth_requestAccounts',
      'eth_sign',
      'eth_ecRecover',
      'personal_sign',
      'personal_ecRecover',
      'eth_signTransaction',
      'eth_sendTransaction',
      'eth_signTypedData_v1',
      'eth_signTypedData_v2',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4',
      'eth_signTypedData',
      'wallet_addEthereumChain',
      'wallet_switchEthereumChain',
      'wallet_watchAsset',
      'wallet_getCapabilities',
      'wallet_sendCalls',
    ];

    return methodsThatRequireSigning.includes(request.method);
  }

  private signerTypeStorage = new ScopedLocalStorage('CBWSDK', 'SignerConfigurator');

  async onDisconnect() {
    this._signer = undefined;
    this.signerTypeStorage.removeItem(SIGNER_TYPE_KEY);
  }

  private tryRestoringSignerFromPersistedType(): Signer | undefined {
    try {
      const persistedSignerType = this.signerTypeStorage.getItem(SIGNER_TYPE_KEY) as SignerType;
      if (persistedSignerType) {
        return this.initSignerFromType(persistedSignerType);
      }

      return undefined;
    } catch (err) {
      this.onDisconnect();
      throw err;
    }
  }

  protected initSignerFromType(signerType: SignerType): Signer {
    switch (signerType) {
      case 'scw':
        return new SCWSigner({
          metadata: this.metadata,
          puc: this.popupCommunicator,
          updateListener: this.updateListener,
        });
      case 'walletlink':
        return new WLSigner({
          metadata: this.metadata,
          updateListener: this.updateListener,
        });
      default:
        throw standardErrors.rpc.internal(`SignerConfigurator: Unknown signer type ${signerType}`);
    }
  }

  private async useSigner(): Promise<Signer> {
    if (this._signer) return this._signer;

    this._signer = await this.selectSigner();
    return this._signer;
  }

  private async selectSigner(): Promise<Signer> {
    try {
      const signerType = await this.selectSignerType();
      const signer = this.initSignerFromType(signerType);

      if (signer instanceof WLSigner) {
        this.popupCommunicator.postMessage<ConfigUpdateMessage>({
          event: ConfigEvent.WalletLinkUpdate,
          data: {
            session: signer.getWalletLinkSession(),
          },
        });
      }

      return signer;
    } catch (err) {
      this.onDisconnect();
      throw err;
    }
  }

  private async selectSignerType(): Promise<SignerType> {
    await this.popupCommunicator.connect();

    const response = await this.popupCommunicator.postMessageForResponse(
      createMessage<ConfigUpdateMessage>({
        event: ConfigEvent.SelectSignerType,
        data: this.preference,
      })
    );
    const signerType = (response as ConfigResponseMessage).data as SignerType;
    this.storeSignerType(signerType);

    return signerType;
  }

  private storeSignerType(signerType: SignerType) {
    this.signerTypeStorage.setItem(SIGNER_TYPE_KEY, signerType);
  }
}
