import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  SubAccountOptions,
} from ':core/provider/interface.js';
import { getCoinbaseInjectedProvider } from ':util/provider.js';
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider.js';

export type CreateProviderOptions = {
  metadata: AppMetadata;
  preference: Preference;
  subAccounts?: SubAccountOptions;
};

export function createCoinbaseWalletProvider(options: CreateProviderOptions) {
  const params: ConstructorOptions = {
    metadata: options.metadata,
    preference: options.preference,
    subAccounts: options.subAccounts,
  };
  return getCoinbaseInjectedProvider(params) ?? new CoinbaseWalletProvider(params);
}
