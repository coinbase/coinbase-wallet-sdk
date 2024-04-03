import { LegacyProviderInterface } from 'src/CoinbaseWalletSDK';

import { Signer, SignerUpdateListener } from '../SignerInterface';
import { StateUpdateListener } from '../UpdateListenerInterface';
import { AddressString } from ':core/type';
import { RequestArguments } from ':core/type/ProviderInterface';

export class ExtSigner implements Signer {
  private adapter: LegacyProviderInterface;
  private updateListener: StateUpdateListener;

  constructor(options: {
    appName: string;
    appLogoUrl: string | null;
    updateListener: SignerUpdateListener;
    adapter: LegacyProviderInterface;
  }) {
    this.updateListener = {
      onAccountsUpdate: (...args) => options.updateListener.onAccountsUpdate(this, ...args),
      onChainUpdate: (...args) => options.updateListener.onChainUpdate(this, ...args),
    };
    this.adapter = options.adapter;
    this.adapter.setAppInfo?.(options.appName, options.appLogoUrl);
  }

  async handshake(): Promise<AddressString[]> {
    const newAddresses = await this.request<AddressString[]>({ method: 'eth_requestAccounts' });
    this.updateListener.onAccountsUpdate({
      accounts: newAddresses,
      source: 'wallet',
    });
    return newAddresses;
  }

  async request<T>(requestArgs: RequestArguments): Promise<T> {
    const response = await this.adapter.request<T>(requestArgs);
    if (
      requestArgs.method === 'wallet_switchEthereumChain' ||
      requestArgs.method === 'wallet_addEthereumChain'
    ) {
      this.updateListener.onChainUpdate({
        chain: {
          id: Number(this.adapter.chainId),
          rpcUrl: this.adapter.jsonRpcUrl,
        },
        source: 'wallet',
      });
    }
    return response;
  }

  async disconnect() {
    this.adapter.close?.();
  }
}
