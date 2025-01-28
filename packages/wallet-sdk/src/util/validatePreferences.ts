import { Preference } from ':core/provider/interface.js';
import { SubAccountSigner } from ':features/sub-accounts/types.js';

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
export function validateSubAccount(subaccount: SubAccountSigner) {
  if (!['webAuthn', 'privateKey'].includes(subaccount.type)) {
    throw new Error(`Invalid subaccount type: ${subaccount.type}`);
  }

  if (typeof subaccount.getSigner !== 'function') {
    throw new Error(`getSigner is not a function`);
  }

  if (typeof subaccount.getAddress !== 'function') {
    throw new Error(`getAddress is not a function`);
  }
}
