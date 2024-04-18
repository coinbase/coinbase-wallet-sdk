import { SCWSigner } from './scw/SCWSigner';
import { Signer } from './SignerInterface';
import { SignRequestHandlerListener } from './UpdateListenerInterface';
import { WLSigner } from './walletlink/WLSigner';
import { PopUpCommunicator } from ':core/communicator/PopUpCommunicator';
import { standardErrors } from ':core/error';
import { createMessage } from ':core/message';
import {
  ConfigEvent,
  ConfigResponseMessage,
  ConfigUpdateMessage,
  SignerType,
} from ':core/message/ConfigMessage';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage';

const SIGNER_TYPE_KEY = 'SignerType';

interface SignerConfiguratorOptions {
  appName: string;
  appLogoUrl?: string | null;
  appChainIds: number[];
  smartWalletOnly: boolean;
  updateListener: SignRequestHandlerListener;
  popupCommunicator: PopUpCommunicator;
}

export class SignerConfigurator {
  private appName: string;
  private appLogoUrl: string | null;
  private appChainIds: number[];
  private connectionPreference: { smartWalletOnly: boolean };

  private popupCommunicator: PopUpCommunicator;
  private updateListener: SignRequestHandlerListener;

  private signerTypeStorage = new ScopedLocalStorage('CBWSDK', 'SignerConfigurator');

  constructor(options: Readonly<SignerConfiguratorOptions>) {
    this.popupCommunicator = options.popupCommunicator;
    this.updateListener = options.updateListener;

    this.appName = options.appName;
    this.appLogoUrl = options.appLogoUrl ?? null;
    this.appChainIds = options.appChainIds;
    this.connectionPreference = {
      ...options,
    };
  }

  tryRestoringSignerFromPersistedType(): Signer | undefined {
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

  async selectSigner(): Promise<Signer> {
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

  async onDisconnect() {
    this.signerTypeStorage.removeItem(SIGNER_TYPE_KEY);
  }

  private async selectSignerType(): Promise<SignerType> {
    await this.popupCommunicator.connect();

    const request = createMessage<ConfigUpdateMessage>({
      event: ConfigEvent.SelectSignerType,
      data: this.connectionPreference,
    });
    const response = (await this.popupCommunicator.request(request)) as ConfigResponseMessage;
    const signerType = response.data as SignerType;
    this.storeSignerType(signerType);

    return signerType;
  }

  protected initSignerFromType(signerType: SignerType): Signer {
    switch (signerType) {
      case 'scw':
        return new SCWSigner({
          appName: this.appName,
          appLogoUrl: this.appLogoUrl,
          appChainIds: this.appChainIds,
          puc: this.popupCommunicator,
          updateListener: this.updateListener,
        });
      case 'walletlink':
        return new WLSigner({
          appName: this.appName,
          appLogoUrl: this.appLogoUrl,
          updateListener: this.updateListener,
        });
      default:
        throw standardErrors.rpc.internal(`SignerConfigurator: Unknown signer type ${signerType}`);
    }
  }

  // storage methods

  private storeSignerType(signerType: SignerType) {
    this.signerTypeStorage.setItem(SIGNER_TYPE_KEY, signerType);
  }
}
