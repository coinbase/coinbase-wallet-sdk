import { Signer, StateUpdateListener } from './interface';
import { SCWSigner } from './scw/SCWSigner';
import { WLSigner } from './walletlink/WLSigner';
import { PopupCommunicator } from ':core/communicator/PopupCommunicator';
import { CB_KEYS_URL } from ':core/constants';
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
  private readonly popupCommunicator: PopupCommunicator;
  private readonly storage = new ScopedLocalStorage('CBWSDK', 'SignerConfigurator');

  constructor(params: Readonly<SignerConfiguratorOptions>) {
    this.metadata = params.metadata;
    this.listener = params.listener;
    const { keysUrl, ...preferenceWithoutKeysUrl } = params.preference;
    this.preference = preferenceWithoutKeysUrl;
    this.popupCommunicator = new PopupCommunicator(new URL(keysUrl ?? CB_KEYS_URL));
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
    const { data } = await this.popupCommunicator.postMessage(request);
    return data as SignerType;
  }

  private initSigner(signerType: SignerType): Signer {
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
  private listenForWalletLinkSessionRequest() {
    this.popupCommunicator
      .onMessage<ConfigMessage>(({ event }) => event === 'WalletLinkSessionRequest')
      .then(async () => {
        const walletlink = new WLSigner({
          metadata: this.metadata,
        });
        this.postWalletLinkUpdate({ session: walletlink.getWalletLinkSession() });
        // Wait for the wallet link session to be established
        await walletlink.handshake();
        this.postWalletLinkUpdate({ connected: true });
      });
  }

  private postWalletLinkUpdate(data: unknown) {
    const update: ConfigMessage = {
      event: 'WalletLinkUpdate',
      data,
    };
    this.popupCommunicator.postMessage(update);
  }
}
