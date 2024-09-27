import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { AppMetadata, ConstructorOptions, Preference } from ':core/provider/interface';
import { getCoinbaseInjectedProvider } from ':util/provider';

export type CreateProviderOptions = {
  metadata: AppMetadata;
  preference: Preference;
};

export function createCoinbaseWalletProvider(options: CreateProviderOptions) {
  const params: ConstructorOptions = {
    metadata: options.metadata,
    preference: options.preference,
  };
  return getCoinbaseInjectedProvider(params) ?? new CoinbaseWalletProvider(params);
}
