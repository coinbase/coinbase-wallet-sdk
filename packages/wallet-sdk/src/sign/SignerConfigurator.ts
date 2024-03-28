import { SCWSigner } from './scw/SCWSigner';
import { PopUpCommunicator } from './scw/transport/PopUpCommunicator';
import { Signer, SignerUpdateListener } from './SignerInterface';
import { SignRequestHandlerListener } from './UpdateListenerInterface';
import { WLSigner } from './walletlink/WLSigner';
import { standardErrors } from ':core/error';
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
  private smartWalletOnly: boolean;

  private popupCommunicator: PopUpCommunicator;
  private updateListener: SignRequestHandlerListener;

  private signerTypeStorage = new ScopedLocalStorage('CBWSDK', 'SignerConfigurator');
  private signerTypeSelectionResolver: ((signerType: string) => void) | undefined;

  signerType: string | null;
  signer: Signer | undefined;

  constructor(options: Readonly<SignerConfiguratorOptions>) {
    this.popupCommunicator = options.popupCommunicator;
    this.updateListener = options.updateListener;

    this.appName = options.appName;
    this.appLogoUrl = options.appLogoUrl ?? null;
    this.appChainIds = options.appChainIds;
    this.smartWalletOnly = options.smartWalletOnly;

    const persistedSignerType = this.signerTypeStorage.getItem(SIGNER_TYPE_KEY);
    this.signerType = persistedSignerType;
    if (persistedSignerType) {
      this.initSigner();
    }

    // getWalletLinkQRCodeUrl is called by the PopUpCommunicator when
    // it receives message.type === 'wlQRCodeUrl' from the cb-wallet-scw popup
    // its injected because we don't want to instantiate WalletLinkSigner until we have to
    this.getWalletLinkQRCodeUrl = this.getWalletLinkQRCodeUrl.bind(this);
    this.popupCommunicator.setGetWalletLinkQRCodeUrlCallback(this.getWalletLinkQRCodeUrl);

    this.setSignerType = this.setSignerType.bind(this);
    this.initWalletLinkSigner = this.initWalletLinkSigner.bind(this);
  }

  private readonly updateRelay: SignerUpdateListener = {
    onAccountsUpdate: (signer, ...rest) => {
      if (this.signer && signer !== this.signer) return; // ignore events from inactive signers
      this.updateListener.onAccountsUpdate(...rest);
    },
    onChainUpdate: (signer, ...rest) => {
      if (this.signer && signer !== this.signer) return; // ignore events from inactive signers
      if (signer instanceof WLSigner) {
        this.signerTypeSelectionResolver?.('walletlink');
      }
      this.updateListener.onChainUpdate(...rest);
    },
  };

  initSigner = () => {
    if (this.signerType === 'scw') {
      this.initScwSigner();
    } else if (this.signerType === 'walletlink') {
      this.initWalletLinkSigner();
    }
  };

  private initScwSigner() {
    if (this.signer instanceof SCWSigner) return;

    this.signer = new SCWSigner({
      appName: this.appName,
      appLogoUrl: this.appLogoUrl,
      appChainIds: this.appChainIds,
      puc: this.popupCommunicator,
      updateListener: this.updateRelay,
    });
  }

  private initWalletLinkSigner() {
    if (this.signer instanceof WLSigner) return;

    this.signer = new WLSigner({
      appName: this.appName,
      appLogoUrl: this.appLogoUrl,
      updateListener: this.updateRelay,
    });
  }

  async onDisconnect() {
    this.signerType = null;
    this.signerTypeStorage.removeItem(SIGNER_TYPE_KEY);
    await this.signer?.disconnect();
    this.signer = undefined;
  }

  getWalletLinkQRCodeUrl() {
    this.initWalletLinkSigner();
    if (!(this.signer instanceof WLSigner)) {
      throw standardErrors.rpc.internal(
        'Signer not initialized or Signer.getWalletLinkUrl not defined'
      );
    }
    return this.signer.getQRCodeUrl();
  }

  async completeSignerTypeSelection() {
    await this.popupCommunicator.connect();

    return new Promise((resolve) => {
      this.signerTypeSelectionResolver = (signerType: string) => {
        this.setSignerType(signerType);
        resolve(signerType);
      };

      this.popupCommunicator
        .selectSignerType({
          smartWalletOnly: this.smartWalletOnly,
        })
        .then((signerType) => {
          this.signerTypeSelectionResolver?.(signerType);
        });
    });
  }

  // storage methods
  private setSignerType(signerType: string) {
    if (this.signerType === signerType) return;
    this.signerType = signerType;
    this.signerTypeStorage.setItem(SIGNER_TYPE_KEY, this.signerType);
  }
}
