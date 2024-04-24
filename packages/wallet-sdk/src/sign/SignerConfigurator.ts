import { Signer, SignRequestHandlerListener } from './interface';
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
import { AppMetadata, ConstructorOptions, Preference } from ':core/provider/interface';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage';

const SIGNER_TYPE_KEY = 'SignerType';

type SignerConfiguratorOptions = ConstructorOptions & {
  updateListener: SignRequestHandlerListener;
};

export class SignerConfigurator {
  private metadata: AppMetadata;
  private preference: Preference;

  private popupCommunicator: PopUpCommunicator;
  private updateListener: SignRequestHandlerListener;

  private signerTypeStorage = new ScopedLocalStorage('CBWSDK', 'SignerConfigurator');
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
    this.updateListener = options.updateListener;
    this.metadata = options.metadata;
  }

  tryRestoringSignerFromPersistedType(): Signer | undefined {
    const persistedSignerType = this.signerTypeStorage.getItem(SIGNER_TYPE_KEY) as SignerType;
    if (persistedSignerType) {
      return this.initSignerFromType(persistedSignerType);
    }
    return undefined;
  }

  async selectSigner(): Promise<Signer> {
    const signerType = await this.requestSignerSelection();
    if (signerType === 'walletlink' && this.walletlinkSigner) {
      return this.walletlinkSigner;
    }
    const signer = this.initSignerFromType(signerType);
    return signer;
  }

  clearStorage() {
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

  protected initSignerFromType(signerType: SignerType): Signer {
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
      updateListener: this.updateListener,
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
