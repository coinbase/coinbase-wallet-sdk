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
  private connectionTypeSelectionResolver: ((signerType: string) => void) | undefined;

  connectionType: string | null;
  signer: Signer | undefined;

  constructor(options: Readonly<SignerConfiguratorOptions>) {
    this.popupCommunicator = options.popupCommunicator;
    this.updateListener = options.updateListener;

    const persistedConnectionType = this.signerTypeStorage.getItem(SIGNER_TYPE_KEY);
    this.connectionType = persistedConnectionType;
    if (persistedConnectionType) {
      this.initSigner();
    }

    this.appName = options.appName;
    this.appLogoUrl = options.appLogoUrl ?? null;
    this.appChainIds = options.appChainIds;
    this.smartWalletOnly = options.smartWalletOnly;

    // getWalletLinkUrl is called by the PopUpCommunicator when
    // it receives message.type === 'wlQRCodeUrl' from the cb-wallet-scw popup
    // its injected because we don't want to instantiate WalletLinkSigner until we have to
    this.getWalletLinkUrl = this.getWalletLinkUrl.bind(this);
    this.popupCommunicator.setWLQRCodeUrlCallback(this.getWalletLinkUrl);

    this.setConnectionType = this.setConnectionType.bind(this);
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
        this.connectionTypeSelectionResolver?.('walletlink');
      }
      this.updateListener.onChainUpdate(...rest);
    },
  };

  initSigner = () => {
    if (this.connectionType === 'scw') {
      this.initScwSigner();
    } else if (this.connectionType === 'walletlink') {
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
    this.connectionType = null;
    this.signerTypeStorage.removeItem(SIGNER_TYPE_KEY);
    await this.signer?.disconnect();
    this.signer = undefined;
  }

  getWalletLinkUrl() {
    this.initWalletLinkSigner();
    if (!(this.signer instanceof WLSigner)) {
      throw standardErrors.rpc.internal(
        'Signer not initialized or Signer.getWalletLinkUrl not defined'
      );
    }
    return this.signer.getQRCodeUrl();
  }

  async completeConnectionTypeSelection() {
    await this.popupCommunicator.connect();

    return new Promise((resolve) => {
      this.connectionTypeSelectionResolver = (signerType: string) => {
        this.setConnectionType(signerType);
        resolve(signerType);
      };

      this.popupCommunicator
        .selectConnectionType({
          smartWalletOnly: this.smartWalletOnly,
        })
        .then((connectionType) => {
          this.connectionTypeSelectionResolver?.(connectionType);
        });
    });
  }

  // storage methods
  private setConnectionType(connectionType: string) {
    if (this.connectionType === connectionType) return;
    this.connectionType = connectionType;
    this.signerTypeStorage.setItem(SIGNER_TYPE_KEY, this.connectionType);
  }
}
