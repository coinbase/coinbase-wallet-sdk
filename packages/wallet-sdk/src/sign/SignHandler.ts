import { Signer, StateUpdateListener } from './interface';
import { SCWSigner } from './scw/SCWSigner';
import { WLSigner } from './walletlink/WLSigner';
import { PopUpCommunicator } from ':core/communicator/PopUpCommunicator';
import { CB_KEYS_URL } from ':core/constants';
import {
  ConfigEvent,
  ConfigResponseMessage,
  ConfigUpdateMessage,
  createMessage,
  isConfigUpdateMessage,
  Message,
  SignerType,
} from ':core/message';
import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  RequestArguments,
} from ':core/provider/interface';
import { ScopedLocalStorage } from ':util/ScopedLocalStorage';

const SIGNER_TYPE_KEY = 'SignerType';

type SignerConfiguratorOptions = ConstructorOptions & {
  listener: StateUpdateListener;
};

export class SignHandler {
  private signer: Signer | null;
  private readonly metadata: AppMetadata;
  private readonly preference: Preference;
  private readonly listener: StateUpdateListener;
  private readonly popupCommunicator: PopUpCommunicator;
  private readonly storage = new ScopedLocalStorage('CBWSDK', 'SignerConfigurator');

  constructor(params: Readonly<SignerConfiguratorOptions>) {
    this.metadata = params.metadata;
    this.listener = params.listener;
    const { keysUrl, ...preferenceWithoutKeysUrl } = params.preference;
    this.preference = preferenceWithoutKeysUrl;
    this.popupCommunicator = new PopUpCommunicator({
      url: keysUrl ?? CB_KEYS_URL,
      onConfigUpdateMessage: this.handleIncomingMessage.bind(this),
    });
    this.signer = this.loadSigner();
  }

  async handshake() {
    const signerType = await this.requestSignerSelection();
    const signer = await this.initSigner(signerType);
    const accounts = await signer.handshake();

    this.storage.setItem(SIGNER_TYPE_KEY, signerType);
    this.signer = signer;

    return accounts;
  }

  async request(request: RequestArguments) {
    if (!this.signer) {
      throw new Error('Signer is not initialized');
    }
    return this.signer.request(request);
  }

  disconnect() {
    this.signer?.disconnect();
    this.signer = null;
    this.storage.removeItem(SIGNER_TYPE_KEY);
  }

  private loadSigner() {
    const signerType = this.storage.getItem(SIGNER_TYPE_KEY) as SignerType;
    return signerType ? this.initSigner(signerType) : null;
  }

  private async requestSignerSelection(): Promise<SignerType> {
    await this.popupCommunicator.connect();
    const message = createMessage<ConfigUpdateMessage>({
      event: ConfigEvent.SelectSignerType,
      data: this.preference,
    });
    const response = await this.popupCommunicator.postMessageForResponse(message);
    return (response as ConfigResponseMessage).data as SignerType;
  }

  private initSigner(signerType: SignerType): Signer {
    if (signerType === 'walletlink' && this.walletlinkSigner) {
      return this.walletlinkSigner;
    }

    const SignerClasses = {
      scw: SCWSigner,
      walletlink: WLSigner,
      extension: undefined,
    };
    return new SignerClasses[signerType]!({
      metadata: this.metadata,
      popupCommunicator: this.popupCommunicator,
      updateListener: this.listener,
    });
  }

  // temporary walletlink signer instance to handle WalletLinkSessionRequest
  // will revisit this when refactoring the walletlink signer
  private walletlinkSigner?: WLSigner;

  protected async handleIncomingMessage(message: Message): Promise<boolean> {
    if (
      !isConfigUpdateMessage(message) || //
      message.event !== ConfigEvent.WalletLinkSessionRequest
    ) {
      return false;
    }

    if (!this.walletlinkSigner) {
      this.walletlinkSigner = this.initSigner('walletlink') as WLSigner;
    }
    await this.walletlinkSigner.handleWalletLinkSessionRequest();
    return true;
  }
}
