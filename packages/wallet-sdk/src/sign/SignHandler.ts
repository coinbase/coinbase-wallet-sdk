import { Signer, StateUpdateListener } from './interface';
import { SCWSigner } from './scw/SCWSigner';
import { WLSigner } from './walletlink/WLSigner';
import { PopUpCommunicator } from ':core/communicator/PopUpCommunicator';
import { CB_KEYS_URL } from ':core/constants';
import { standardErrors } from ':core/error';
import { createMessage } from ':core/message';
import {
  ConfigEvent,
  ConfigResponseMessage,
  ConfigUpdateMessage,
  SignerType,
} from ':core/message/ConfigMessage';
import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  RequestArguments,
} from ':core/provider/interface';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage';

const SIGNER_TYPE_KEY = 'SignerType';

type SignerConfiguratorOptions = ConstructorOptions & {
  listener: StateUpdateListener;
};

export class SignHandler {
  private readonly metadata: AppMetadata;
  private readonly preference: Preference;
  private readonly popupCommunicator: PopUpCommunicator;
  private readonly listener: StateUpdateListener;
  // temporary walletlink signer instance to handle WalletLinkSessionRequest
  // will revisit this when refactoring the walletlink signer
  private walletlinkSigner?: WLSigner;

  constructor(options: Readonly<SignerConfiguratorOptions>) {
    const { keysUrl, ...preferenceWithoutKeysUrl } = options.preference;
    this.preference = preferenceWithoutKeysUrl;
    this.popupCommunicator = new PopUpCommunicator({
      url: keysUrl ?? CB_KEYS_URL,
      onConfigUpdateMessage: this.handleConfigUpdateMessage.bind(this),
    });
    this.listener = options.listener;
    this.metadata = options.metadata;

    const persistedSignerType = this.signerTypeStorage.getItem(SIGNER_TYPE_KEY) as SignerType;
    if (persistedSignerType) {
      this._signer = this.initSignerFromType(persistedSignerType);
    }
  }

  private _signer: Signer | undefined;

  protected async useSigner(): Promise<Signer> {
    if (this._signer) return this._signer;
    this._signer = await this.selectSigner();
    return this._signer;
  }

  async handshake() {
    const signer = await this.useSigner();
    return await signer.handshake();
  }

  async handleRequest(request: RequestArguments) {
    const signer = await this.useSigner();
    return await signer.request(request);
  }

  protected async selectSigner(): Promise<Signer> {
    const signerType = await this.requestSignerSelection();
    if (signerType === 'walletlink' && this.walletlinkSigner) {
      return this.walletlinkSigner;
    }
    const signer = this.initSignerFromType(signerType);
    return signer;
  }

  async onDisconnect() {
    this._signer = undefined;
    this.signerTypeStorage.removeItem(SIGNER_TYPE_KEY);
  }

  private async requestSignerSelection(): Promise<SignerType> {
    await this.popupCommunicator.connect();

    const message = createMessage<ConfigUpdateMessage>({
      event: ConfigEvent.SelectSignerType,
      data: this.preference,
    });
    const response = await this.popupCommunicator.postMessageForResponse(message);
    const signerType = (response as ConfigResponseMessage).data as SignerType;
    this.signerTypeStorage.setItem(SIGNER_TYPE_KEY, signerType);

    return signerType;
  }

  private signerTypeStorage = new ScopedLocalStorage('CBWSDK', 'SignerConfigurator');

  private initSignerFromType(signerType: SignerType): Signer {
    const signerClasses = {
      scw: SCWSigner,
      walletlink: WLSigner,
      extension: undefined,
    };

    const SignerClass = signerClasses[signerType];
    if (!SignerClass) {
      throw standardErrors.rpc.internal(`SignerConfigurator: Unknown signer type ${signerType}`);
    }

    return new SignerClass({
      metadata: this.metadata,
      popupCommunicator: this.popupCommunicator,
      updateListener: this.listener,
    });
  }

  private async handleConfigUpdateMessage(message: ConfigUpdateMessage) {
    switch (message.event) {
      case ConfigEvent.WalletLinkSessionRequest:
        if (!this.walletlinkSigner) {
          this.walletlinkSigner = this.initSignerFromType('walletlink') as WLSigner;
        }
        await this.walletlinkSigner.handleWalletLinkSessionRequest();
        break;
    }
  }
}
