import { Signer, SignerUpdateListener } from '../SignerInterface';
import { WLRelayAdapter } from './relay/WLRelayAdapter';
import { WALLETLINK_URL } from ':core/constants';
import { standardErrors } from ':core/error';
import { AddressString } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';

export class WLSigner implements Signer {
  private adapter: WLRelayAdapter;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    updateListener: SignerUpdateListener;
  }) {
    this.adapter = new WLRelayAdapter({
      ...options,
      walletlinkUrl: WALLETLINK_URL,
      updateListener: {
        onAccountsUpdate: (...args) => options.updateListener.onAccountsUpdate(this, ...args),
        onChainUpdate: (...args) => options.updateListener.onChainUpdate(this, ...args),
      },
    });
  }

  async handshake(): Promise<AddressString[]> {
    return await this.request<AddressString[]>({ method: 'eth_requestAccounts' });
  }

  // TODO: add WL support for new RPC methods
  private isUnsupportedByWL(methodName: string) {
    return [
      'wallet_getCapabilities',
      'wallet_sendTransaction',
      'wallet_getTransactionStatus',
    ].includes(methodName);
  }

  async request<T>(requestArgs: RequestArguments): Promise<T> {
    if (this.isUnsupportedByWL(requestArgs.method)) {
      Promise.reject(standardErrors.rpc.methodNotSupported());
    }
    return this.adapter.request<T>(requestArgs);
  }

  getQRCodeUrl(): string {
    return this.adapter.getQRCodeUrl();
  }

  async disconnect() {
    await this.adapter.close();
  }
}
