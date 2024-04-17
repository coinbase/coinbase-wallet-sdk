import { PopUpCommunicator } from './scw/transport/PopUpCommunicator';
import { SignerConfigurator } from './SignerConfigurator';
import { Signer } from './SignerInterface';
import { SignRequestHandlerListener } from './UpdateListenerInterface';
import { WLSigner } from './walletlink/WLSigner';
import { CB_KEYS_URL } from ':core/constants';
import { standardErrorCodes, standardErrors } from ':core/error';
import { WalletLinkConfigEventType } from ':core/message/ConfigMessage';
import { AddressString } from ':core/type';
import { ConstructorOptions, RequestArguments } from ':core/type/ProviderInterface';
import { RequestHandler } from ':core/type/RequestHandlerInterface';

type SignRequestHandlerOptions = ConstructorOptions & {
  updateListener: SignRequestHandlerListener;
  keysUrl?: string;
};

export class SignRequestHandler implements RequestHandler {
  private _signer: Signer | undefined;

  private popupCommunicator: PopUpCommunicator;
  private updateListener: SignRequestHandlerListener;
  private signerConfigurator: SignerConfigurator;

  constructor(options: Readonly<SignRequestHandlerOptions>) {
    this.popupCommunicator = new PopUpCommunicator({
      url: options.keysUrl ?? CB_KEYS_URL,
    });
    this.updateListener = options.updateListener;
    this.signerConfigurator = new SignerConfigurator({
      ...options,
      popupCommunicator: this.popupCommunicator,
    });
    this.tryRestoringSignerFromPersistedType();
  }

  async handleRequest(request: RequestArguments, accounts: AddressString[]) {
    try {
      if (request.method === 'eth_requestAccounts') {
        return await this.eth_requestAccounts(accounts);
      }

      const signer = await this.useSigner();
      if (accounts.length <= 0) {
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      }

      return await signer.request(request);
    } catch (err) {
      if ((err as { code?: unknown })?.code === standardErrorCodes.provider.unauthorized) {
        this.updateListener.onResetConnection();
      }
      throw err;
    }
  }

  private async eth_requestAccounts(accounts: AddressString[]): Promise<AddressString[]> {
    if (accounts.length > 0) {
      this.updateListener.onConnect();
      return Promise.resolve(accounts);
    }

    try {
      const signer = await this.useSigner();
      const ethAddresses = await signer.handshake();
      if (Array.isArray(ethAddresses)) {
        if (signer instanceof WLSigner) {
          this.popupCommunicator.postConfigMessage(
            WalletLinkConfigEventType.DappWalletLinkConnected
          );
        }
        this.updateListener.onConnect();
        return Promise.resolve(ethAddresses);
      }

      return Promise.reject(standardErrors.rpc.internal('Failed to get accounts'));
    } catch (err) {
      if (this._signer instanceof WLSigner) {
        this.popupCommunicator.disconnect();
        await this.onDisconnect();
      }
      throw err;
    }
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
      'wallet_sendCalls',
    ];

    return methodsThatRequireSigning.includes(request.method);
  }

  async onDisconnect() {
    this._signer = undefined;
    await this.signerConfigurator.onDisconnect();
  }

  private tryRestoringSignerFromPersistedType() {
    this._signer = this.signerConfigurator.tryRestoringSignerFromPersistedType();
  }

  private async useSigner(): Promise<Signer> {
    if (this._signer) return this._signer;

    this._signer = await this.signerConfigurator.selectSigner();
    return this._signer;
  }
}
