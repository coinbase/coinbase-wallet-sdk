import { createCoinbaseWalletProvider } from './createCoinbaseWalletProvider.js';
import { VERSION } from './sdk-info.js';
import {
  AppMetadata,
  ConstructorOptions,
  Preference,
  ProviderInterface,
} from ':core/provider/interface.js';
import { ScopedLocalStorage } from ':core/storage/ScopedLocalStorage.js';
import { SubAccount } from ':features/sub-accounts/state.js';
import { SubAccountSigner } from ':features/sub-accounts/types.js';
import { checkCrossOriginOpenerPolicy } from ':util/checkCrossOriginOpenerPolicy.js';
import { validatePreferences, validateSubAccount } from ':util/validatePreferences.js';

export type CreateCoinbaseWalletSDKOptions = Partial<AppMetadata> & {
  preference?: Preference;
  subaccount?: SubAccountSigner;
};

const DEFAULT_PREFERENCE: Preference = {
  options: 'all',
};

/**
 * Create a Coinbase Wallet SDK instance.
 * @param params - Options to create a Coinbase Wallet SDK instance.
 * @returns A Coinbase Wallet SDK object.
 */
export function createCoinbaseWalletSDK(params: CreateCoinbaseWalletSDKOptions) {
  const versionStorage = new ScopedLocalStorage('CBWSDK');
  versionStorage.setItem('VERSION', VERSION);

  void checkCrossOriginOpenerPolicy();

  const { appName, appLogoUrl, appChainIds, preference, subaccount } = params;

  const options: ConstructorOptions = {
    metadata: {
      appName: appName || 'Dapp',
      appLogoUrl: appLogoUrl || '',
      appChainIds: appChainIds || [],
    },
    preference: Object.assign(DEFAULT_PREFERENCE, preference ?? {}),
  };

  /**
   * Validate user supplied preferences. Throws if key/values are not valid.
   */
  validatePreferences(options.preference);

  /**
   * Set the sub account signer inside the store.
   */
  if (subaccount) {
    validateSubAccount(subaccount);
    // store the signer in the sub account store
    SubAccount.setState({
      getSigner: subaccount.getSigner,
      getAddress: subaccount.getAddress,
      type: subaccount.type,
    });
  }

  let provider: ProviderInterface | null = null;

  return {
    getProvider: () => {
      if (!provider) {
        provider = createCoinbaseWalletProvider(options);
      }
      return provider;
    },
  };
}
