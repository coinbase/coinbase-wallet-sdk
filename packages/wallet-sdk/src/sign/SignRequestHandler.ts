import { PopUpCommunicator } from './scw/transport/PopUpCommunicator';
import { SignerConfigurator } from './SignerConfigurator';
import { SignRequestHandlerListener } from './UpdateListenerInterface';
import { CB_KEYS_URL } from ':core/constants';
import { standardErrorCodes, standardErrors } from ':core/error';
import { AddressString } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';
import { RequestHandler } from ':core/type/RequestHandlerInterface';

interface SignRequestHandlerOptions {
  appName: string;
  appLogoUrl?: string | null;
  appChainIds: number[];
  smartWalletOnly: boolean;
  updateListener: SignRequestHandlerListener;
}

export class SignRequestHandler implements RequestHandler {
  private popupCommunicator: PopUpCommunicator;
  private updateListener: SignRequestHandlerListener;
  private signerConfigurator: SignerConfigurator;

  constructor(options: Readonly<SignRequestHandlerOptions>) {
    this.popupCommunicator = new PopUpCommunicator({
      url: CB_KEYS_URL,
    });
    this.updateListener = options.updateListener;
    this.signerConfigurator = new SignerConfigurator({
      ...options,
      popupCommunicator: this.popupCommunicator,
    });
  }

  async handleRequest(request: RequestArguments, accounts: AddressString[]) {
    try {
      if (request.method === 'eth_requestAccounts') {
        return await this.eth_requestAccounts(accounts);
      }

      if (!this.signerConfigurator.signer || accounts.length <= 0) {
        throw standardErrors.provider.unauthorized(
          "Must call 'eth_requestAccounts' before other methods"
        );
      }

      return await this.signerConfigurator.signer.request(request);
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

    if (!this.signerConfigurator.signerType) {
      // WL: this promise hangs until the QR code is scanned
      // SCW: this promise hangs until the user signs in with passkey
      await this.signerConfigurator.completeSignerTypeSelection();
    }

    try {
      // in the case of walletlink, this doesn't do anything since signer is initialized
      // when the wallet link QR code url is requested
      this.signerConfigurator.initSigner();

      const ethAddresses = await this.signerConfigurator.signer?.handshake();
      if (Array.isArray(ethAddresses)) {
        if (this.signerConfigurator.signerType === 'walletlink') {
          this.popupCommunicator.walletLinkQrScanned();
        }
        this.updateListener.onConnect();
        return Promise.resolve(ethAddresses);
      }

      return Promise.reject(standardErrors.rpc.internal('Failed to get accounts'));
    } catch (err) {
      if (this.signerConfigurator.signerType === 'walletlink') {
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
      'wallet_getCallsStatus',
    ];

    return methodsThatRequireSigning.includes(request.method);
  }

  async onDisconnect() {
    await this.signerConfigurator.onDisconnect();
  }
}
