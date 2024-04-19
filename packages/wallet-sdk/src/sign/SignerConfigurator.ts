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
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage';
import { AppMetadata, ConstructorOptions, Preference } from ':core/type/ProviderInterface';

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

  constructor(options: Readonly<SignerConfiguratorOptions>) {
    const { keysUrl, ...preferenceWithoutKeysUrl } = options.preference;
    this.preference = preferenceWithoutKeysUrl;
    this.popupCommunicator = new PopUpCommunicator({
      url: keysUrl ?? CB_KEYS_URL,
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
    const signerType = await this.selectSignerType();
    const signer = this.initSignerFromType(signerType);
    return signer;
  }

  clearStorage() {
    this.signerTypeStorage.removeItem(SIGNER_TYPE_KEY);
  }

  private async selectSignerType(): Promise<SignerType> {
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
}
