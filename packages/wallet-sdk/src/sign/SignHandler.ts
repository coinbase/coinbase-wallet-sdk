import { AccountsUpdate, ChainUpdate, Signer } from './interface';
import { SCWSigner } from './scw/SCWSigner';
import { WLSigner } from './walletlink/WLSigner';
import { KeysPopupCommunicator } from ':core/communicator/KeysPopupCommunicator';
import { standardErrors } from ':core/error';
import { ConfigMessage, SignerType } from ':core/message';
import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  RequestArguments,
} from ':core/provider/interface';
import { AddressString, Chain, IntNumber } from ':core/type';
import { areAddressArraysEqual, hexStringFromIntNumber } from ':core/type/util';
import { ScopedLocalStorage } from ':util/ScopedLocalStorage';

const SIGNER_TYPE_KEY = 'SignerType';

export class SignHandler extends KeysPopupCommunicator {
  accounts: AddressString[];
  chain: Chain;

  private signer: Signer | null;
  private readonly metadata: AppMetadata;
  private readonly preference: Preference;
  private readonly storage = new ScopedLocalStorage('CBWSDK', 'SignerConfigurator');

  constructor(params: Readonly<ConstructorOptions>) {
    const { keysUrl, ...preferenceWithoutKeysUrl } = params.preference;
    super(keysUrl);

    this.preference = preferenceWithoutKeysUrl;
    this.metadata = params.metadata;
    this.signer = this.loadSigner();

    this.accounts = [];
    this.chain = {
      id: params.metadata.appChainIds?.[0] ?? 1,
    };
  }

  get connected() {
    return this.accounts.length > 0;
  }

  async handshake() {
    if (this.connected) return this.accounts;

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
    if (!this.connected) {
      throw standardErrors.provider.unauthorized(
        "Must call 'eth_requestAccounts' before other methods"
      );
    }
    return this.signer.request(request);
  }

  disconnect() {
    this.accounts = [];
    this.chain = { id: 1 };

    this.signer?.disconnect();
    this.signer = null;
    this.storage.removeItem(SIGNER_TYPE_KEY);
    super.disconnect();
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
    const { data } = await super.postMessage(request);
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
      postMessageToPopup: super.postMessage.bind(this),
      updateListener: this.updateListener,
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

  protected readonly updateListener = {
    onAccountsUpdate: ({ accounts, source }: AccountsUpdate) => {
      if (areAddressArraysEqual(this.accounts, accounts)) return;
      this.accounts = accounts;
      if (source === 'storage') return;
      this.emit('accountsChanged', this.accounts);
    },
    onChainUpdate: ({ chain, source }: ChainUpdate) => {
      if (chain.id === this.chain.id && chain.rpcUrl === this.chain.rpcUrl) return;
      this.chain = chain;
      if (source === 'storage') return;
      this.emit('chainChanged', hexStringFromIntNumber(IntNumber(chain.id)));
    },
  };

  emit(_: string, __: unknown) {
    // TODO
    throw new Error('Method not implemented.');
  }
}
