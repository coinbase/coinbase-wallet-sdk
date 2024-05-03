import { Signer, StateUpdateListener } from './interface';
import { SCWSigner } from './scw/SCWSigner';
import { WLSigner } from './walletlink/WLSigner';
import { Communicator } from ':core/communicator/Communicator';
import { ConfigMessage, SignerType } from ':core/message';
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
  private readonly communicator: Communicator;
  private readonly storage = new ScopedLocalStorage('CBWSDK', 'SignerConfigurator');

  constructor(params: Readonly<SignerConfiguratorOptions>) {
    const { keysUrl, ...preferenceWithoutKeysUrl } = params.preference;
    this.communicator = new Communicator(keysUrl);
    this.preference = preferenceWithoutKeysUrl;
    this.metadata = params.metadata;
    this.listener = params.listener;
    this.signer = this.loadSigner();
  }

  async handshake() {
    const signerType = await this.requestSignerSelection();
    const signer = this.initSigner(signerType);
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
    this.communicator.disconnect();
  }

  private loadSigner() {
    const signerType = this.storage.getItem(SIGNER_TYPE_KEY) as SignerType;
    return signerType ? this.initSigner(signerType) : null;
  }

  private async requestSignerSelection(): Promise<SignerType> {
    this.listenForWalletLinkSessionRequest();

    const request: ConfigMessage = {
      id: crypto.randomUUID(),
      event: 'selectSignerType',
      data: this.preference,
    };
    const { data } = await this.communicator.postMessage(request);
    return data as SignerType;
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
      postMessageToPopup: this.communicator.postMessage.bind(this),
      updateListener: this.listener,
    });
  }

  // temporary walletlink signer instance to handle WalletLinkSessionRequest
  // will revisit this when refactoring the walletlink signer
  private walletlinkSigner?: WLSigner;
  private listenForWalletLinkSessionRequest() {
    this.communicator
      .onMessage<ConfigMessage>(({ event }) => event === 'WalletLinkSessionRequest')
      .then(async () => {
        if (!this.walletlinkSigner) {
          this.walletlinkSigner = this.initSigner('walletlink') as WLSigner;
        }
        await this.walletlinkSigner.handleWalletLinkSessionRequest();
      });
  }
}
