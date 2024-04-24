import { Signer, SignRequestHandlerListener } from './interface';
import { SignerConfigurator } from './SignerConfigurator';
import { standardErrorCodes, standardErrors } from ':core/error';
import { ConstructorOptions, RequestArguments } from ':core/provider/interface';
import { RequestHandler } from ':core/provider/RequestHandlerInterface';
import { AddressString } from ':core/type';

type SignRequestHandlerOptions = ConstructorOptions & {
  updateListener: SignRequestHandlerListener;
};

export class SignRequestHandler implements RequestHandler<'sign'> {
  private _signer: Signer | undefined;

  private updateListener: SignRequestHandlerListener;
  private signerConfigurator: SignerConfigurator;

  constructor(options: Readonly<SignRequestHandlerOptions>) {
    this.updateListener = options.updateListener;
    this.signerConfigurator = new SignerConfigurator(options);
    this.tryRestoringSignerFromPersistedType();
  }

  async handleRequest(request: RequestArguments, accounts: AddressString[]) {
    try {
      if (request.method === 'eth_requestAccounts') {
        if (accounts.length > 0) return accounts;
        return await this.requestAccounts();
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

  private async requestAccounts(): Promise<AddressString[]> {
    const signer = await this.useSigner();
    const ethAddresses = await signer.handshake();
    this.updateListener.onConnect();
    return ethAddresses;
  }

  async onDisconnect() {
    this._signer = undefined;
    this.signerConfigurator.clearStorage();
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
