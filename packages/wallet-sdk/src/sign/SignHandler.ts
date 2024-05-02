import { Signer, StateUpdateListener } from './interface';
import { SCWSigner } from './scw/SCWSigner';
import { WLSigner } from './walletlink/WLSigner';
import { KeysPopupCommunicator } from ':core/communicator/KeysPopupCommunicator';
import { ConfigMessage, SignerType } from ':core/message';
import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  RequestArguments,
} from ':core/provider/interface';
import { ScopedLocalStorage } from ':util/ScopedLocalStorage';

const SIGNER_TYPE_KEY = 'SignerType';

export abstract class SignHandler extends KeysPopupCommunicator {
  private signer: Signer | null = null;

  private readonly storage = new ScopedLocalStorage('CBWSDK', 'SignHandler');

  private readonly metadata: AppMetadata;
  private readonly preference: Preference;

  protected abstract stateUpdateListener: StateUpdateListener;

  constructor(params: Readonly<ConstructorOptions>) {
    const { keysUrl, ...preferenceWithoutKeysUrl } = params.preference;
    super(keysUrl);
    this.preference = preferenceWithoutKeysUrl;
    this.metadata = params.metadata;
  }

  async signHandshake() {
    const signerType = await this.requestSignerSelection();
    const signer = this.initSigner(signerType);
    const accounts = await signer.handshake();

    this.storage.setItem(SIGNER_TYPE_KEY, signerType);
    this.signer = signer;

    return accounts;
  }

  async signRequest(request: RequestArguments) {
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

  protected loadSigner() {
    const signerType = this.storage.getItem(SIGNER_TYPE_KEY) as SignerType;
    if (signerType) this.signer = this.initSigner(signerType);
  }

  private async requestSignerSelection(): Promise<SignerType> {
    this.listenForWalletLinkSessionRequest();

    const request: ConfigMessage = {
      id: crypto.randomUUID(),
      event: 'selectSignerType',
      data: this.preference,
    };
    const { data } = await this.postMessage(request);
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
      postMessageToPopup: this.postMessage.bind(this),
      updateListener: this.stateUpdateListener,
    });
  }

  // temporary walletlink signer instance to handle WalletLinkSessionRequest
  // will revisit this when refactoring the walletlink signer
  private walletlinkSigner?: WLSigner;
  private listenForWalletLinkSessionRequest() {
    this.onMessage<ConfigMessage>(({ event }) => event === 'WalletLinkSessionRequest').then(
      async () => {
        if (!this.walletlinkSigner) {
          this.walletlinkSigner = this.initSigner('walletlink') as WLSigner;
        }
        await this.walletlinkSigner.handleWalletLinkSessionRequest();
      }
    );
  }
}
