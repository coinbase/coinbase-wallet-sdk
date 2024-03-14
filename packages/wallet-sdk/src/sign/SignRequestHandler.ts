import { SCWSigner } from './scw/SCWSigner';
import { ConnectionType } from './scw/transport/ConfigMessage';
import { PopUpCommunicator } from './scw/transport/PopUpCommunicator';
import { Signer, SignerUpdateListener } from './SignerInterface';
import { SignRequestHandlerListener } from './UpdateListenerInterface';
import { WLSigner } from './walletlink/WLSigner';
import { ConnectionPreference } from ':core/communicator/ConnectionPreference';
import { CB_KEYS_URL } from ':core/constants';
import { standardErrorCodes, standardErrors } from ':core/error';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage';
import { AddressString } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';
import { RequestHandler } from ':core/type/RequestHandlerInterface';

interface SignRequestHandlerOptions {
  scwUrl?: string;
  appName: string;
  appLogoUrl?: string | null;
  appChainIds: number[];
  connectionPreference: ConnectionPreference;
  updateListener: SignRequestHandlerListener;
}

const SIGNER_TYPE_KEY = 'SignerType';

export class SignRequestHandler implements RequestHandler {
  private appName: string;
  private appLogoUrl: string | null;
  private appChainIds: number[];
  private connectionPreference: ConnectionPreference;

  private connectionType: string | null;
  private connectionTypeSelectionResolver: ((value: unknown) => void) | undefined;
  private signer: Signer | undefined;

  // should be encapsulated under ConnectorConfigurator
  private signerTypeStorage = new ScopedLocalStorage('CBWSDK', 'SignRequestHandler');
  private popupCommunicator: PopUpCommunicator;
  private updateListener: SignRequestHandlerListener;

  constructor(options: Readonly<SignRequestHandlerOptions>) {
    this.popupCommunicator = new PopUpCommunicator({
      url: options.scwUrl || CB_KEYS_URL,
    });
    this.updateListener = options.updateListener;

    // getWalletLinkUrl is called by the PopUpCommunicator when
    // it receives message.type === 'wlQRCodeUrl' from the cb-wallet-scw popup
    // its injected because we don't want to instantiate WalletLinkSigner until we have to
    this.getWalletLinkUrl = this.getWalletLinkUrl.bind(this);
    this.popupCommunicator.setWLQRCodeUrlCallback(this.getWalletLinkUrl);

    this.appName = options.appName;
    this.appLogoUrl = options.appLogoUrl ?? null;
    this.appChainIds = options.appChainIds;

    const persistedConnectionType = this.signerTypeStorage.getItem(SIGNER_TYPE_KEY);
    this.connectionType = persistedConnectionType;
    this.connectionPreference = options.connectionPreference;

    if (persistedConnectionType) {
      this.initSigner();
    }

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

  private initSigner = () => {
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
  }

  async handleRequest(request: RequestArguments, accounts: AddressString[]) {
    try {
      if (request.method === 'eth_requestAccounts') {
        return await this.eth_requestAccounts(accounts);
      }

      if (!this.signer || accounts.length <= 0) {
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      }

      return await this.signer.request(request);
    } catch (err) {
      if ((err as { code?: unknown })?.code === standardErrorCodes.provider.unauthorized) {
        this.updateListener.onResetConnection();
      }
      throw err;
    }
  }

  async eth_requestAccounts(accounts: AddressString[]): Promise<AddressString[]> {
    if (accounts.length > 0) {
      this.updateListener.onConnect();
      return Promise.resolve(accounts);
    }

    if (!this.connectionType) {
      // WL: this promise hangs until the QR code is scanned
      // SCW: this promise hangs until the user signs in with passkey
      const connectionType = await this.completeConnectionTypeSelection();
      this.setConnectionType(connectionType as ConnectionType);
    }

    try {
      // in the case of walletlink, this doesn't do anything since signer is initialized
      // when the wallet link QR code url is requested
      this.initSigner();

      const ethAddresses = await this.signer?.handshake();
      if (Array.isArray(ethAddresses)) {
        if (this.connectionType === 'walletlink') {
          this.popupCommunicator.walletLinkQrScanned();
        }
        this.updateListener.onConnect();
        return Promise.resolve(ethAddresses);
      }

      return Promise.reject(standardErrors.rpc.internal('Failed to get accounts'));
    } catch (err) {
      if (this.connectionType === 'walletlink') {
        this.popupCommunicator.disconnect();
        this.onDisconnect();
      }
      throw err;
    }
  }

  private getWalletLinkUrl() {
    this.initWalletLinkSigner();
    if (!(this.signer instanceof WLSigner)) {
      throw standardErrors.rpc.internal(
        'Signer not initialized or Signer.getWalletLinkUrl not defined'
      );
    }
    return this.signer.getQRCodeUrl();
  }

  private async completeConnectionTypeSelection() {
    await this.popupCommunicator.connect();

    return new Promise((resolve) => {
      this.connectionTypeSelectionResolver = resolve.bind(this);

      this.popupCommunicator
        .selectConnectionType({
          connectionPreference: this.connectionPreference,
        })
        .then((connectionType) => {
          resolve(connectionType);
        });
    });
  }

  // storage methods
  private setConnectionType(connectionType: string) {
    if (this.connectionType === connectionType) return;
    this.connectionType = connectionType;
    this.signerTypeStorage.setItem(SIGNER_TYPE_KEY, this.connectionType);
  }

  canHandleRequest(request: RequestArguments): boolean {
    const methodsThatRequireSigning = [
      'eth_requestAccounts',
      'eth_sign',
      'eth_ecRecover',
      'personal_sign',
      'personal_ecRecover',
      'eth_signTransaction',
      'eth_sendTransaction',
      'eth_signTypedData_v1',
      'eth_signTypedData_v2',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4',
      'eth_signTypedData',
      'wallet_addEthereumChain',
      'wallet_switchEthereumChain',
      'wallet_watchAsset',
      'wallet_getCapabilities',
      'wallet_sendTransaction',
      'wallet_getTransactionStatus',
      'wallet_showTransactionStatus',
    ];

    return methodsThatRequireSigning.includes(request.method);
  }
}
