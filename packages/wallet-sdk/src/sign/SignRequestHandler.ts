import { Signer, SignRequestHandlerListener } from './interface';
import { SignerConfigurator } from './SignerConfigurator';
import { standardErrorCodes, standardErrors } from ':core/error';
import { AddressString } from ':core/type';
import { ConstructorOptions, RequestArguments } from ':core/type/ProviderInterface';
import { RequestHandler } from ':core/type/RequestHandlerInterface';

type SignRequestHandlerOptions = ConstructorOptions & {
  updateListener: SignRequestHandlerListener;
};

export class SignRequestHandler implements RequestHandler {
  private signer: Signer | undefined;

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
      this.updateListener.onConnect();
      return Promise.resolve(ethAddresses);
    } catch (err) {
      return Promise.reject(standardErrors.rpc.internal('Failed to get accounts'));
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
    this.signer = undefined;
    this.signerConfigurator.clearStorage();
  }

  private tryRestoringSignerFromPersistedType() {
    this.signer = this.signerConfigurator.tryRestoringSignerFromPersistedType();
  }

  private async useSigner(): Promise<Signer> {
    if (this.signer) return this.signer;

    this.signer = await this.signerConfigurator.selectSigner();
    return this.signer;
  }
}
