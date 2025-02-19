import { Preference } from ':core/provider/interface.js';
import { SubAccountState } from ':stores/sub-accounts/store.js';

/**
 * Validates user supplied preferences. Throws if keys are not valid.
 * @param preference
 */
export function validatePreferences(preference?: Preference) {
  if (!preference) {
    return;
  }

  if (!['all', 'smartWalletOnly', 'eoaOnly'].includes(preference.options)) {
    throw new Error(`Invalid options: ${preference.options}`);
  }

  if (preference.attribution) {
    if (
      preference.attribution.auto !== undefined &&
      preference.attribution.dataSuffix !== undefined
    ) {
      throw new Error(`Attribution cannot contain both auto and dataSuffix properties`);
    }
  }
}

/**
 * Validates user supplied subaccount. Throws if keys are not valid.
 * @param subaccount
 */
export function validateSubAccount(subaccount: SubAccountState['getSigner']) {
  if (typeof subaccount !== 'function') {
    throw new Error(`getSigner is not a function`);
  }
}
