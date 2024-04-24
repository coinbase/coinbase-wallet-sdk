import { Signer, SignRequestHandlerListener } from './interface';
import { SignerConfigurator } from './SignerConfigurator';
import { ConstructorOptions, RequestArguments } from ':core/provider/interface';

type SignRequestHandlerOptions = ConstructorOptions & {
  updateListener: SignRequestHandlerListener;
};

export class SignRequestHandler {
  private updateListener: SignRequestHandlerListener;
  private signerConfigurator: SignerConfigurator;

  constructor(options: Readonly<SignRequestHandlerOptions>) {
    this.updateListener = options.updateListener;
    this.signerConfigurator = new SignerConfigurator(options);
    this.tryRestoringSignerFromPersistedType();
  }

  async handleRequest(request: RequestArguments) {
    const signer = await this.useSigner();
    if (request.method === 'eth_requestAccounts') {
      const accounts = await signer.handshake();
      this.updateListener.onConnect();
      return accounts;
    }
    return signer.request(request);
  }

  async onDisconnect() {
    this._signer = undefined;
    this.signerConfigurator.clearStorage();
  }

  private tryRestoringSignerFromPersistedType() {
    this._signer = this.signerConfigurator.tryRestoringSignerFromPersistedType();
  }

  private _signer: Signer | undefined;
  private async useSigner(): Promise<Signer> {
    if (this._signer) return this._signer;

    this._signer = await this.signerConfigurator.selectSigner();
    return this._signer;
  }
}
