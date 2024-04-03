import { LegacyProviderInterface } from 'src/CoinbaseWalletSDK';

import { ExtSigner } from './extension/ExtSigner';
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
    try {
      if (persistedSignerType) {
        this.initSigner();
      }
    } catch {
      this.onDisconnect();
    }

    // getWalletLinkQRCodeUrl is called by the PopUpCommunicator when
    // it receives message.type === 'wlQRCodeUrl' from the cb-wallet-scw popup
    // its injected because we don't want to instantiate WalletLinkSigner until we have to
    this.getWalletLinkQRCodeUrl = this.getWalletLinkQRCodeUrl.bind(this);
    this.popupCommunicator.setGetWalletLinkQRCodeUrlCallback(this.getWalletLinkQRCodeUrl);

    this.setSignerType = this.setSignerType.bind(this);
    this.initWalletLinkSigner = this.initWalletLinkSigner.bind(this);
  }

  private get walletExtension(): LegacyProviderInterface | undefined {
    return window.coinbaseWalletExtension;
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
    switch (this.signerType) {
      case 'scw':
        this.initScwSigner();
        break;
      case 'walletlink':
        this.initWalletLinkSigner();
        break;
      case 'extension':
        this.initExtensionSigner();
        break;
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

  private initExtensionSigner() {
    if (this.signer instanceof ExtSigner) return;

    if (!this.walletExtension) {
      throw standardErrors.rpc.internal('Coinbase Wallet extension not found');
    }

    this.signer = new ExtSigner({
      appName: this.appName,
      appLogoUrl: this.appLogoUrl,
      updateListener: this.updateRelay,
      adapter: this.walletExtension,
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

    return new Promise((resolve, reject) => {
      // Promise can be resolved on either smart wallet onboarding flow or
      // WalletLink WLSigner handshake
      this.signerTypeSelectionResolver = (signerType: string) => {
        this.setSignerType(signerType);
        resolve(signerType);
      };

      this.popupCommunicator
        .selectSignerType({
          smartWalletOnly: this.smartWalletOnly,
          isExtensionAvailable: !!this.walletExtension,
        })
        .then((signerType) => {
          this.signerTypeSelectionResolver?.(signerType);
        })
        .catch((err) => {
          reject(err);
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
