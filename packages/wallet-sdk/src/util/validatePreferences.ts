import { Preference } from ':core/provider/interface.js';

/**
 * Validates user supplied preferences. Throws if keys are not valid.
 * @param preference
 */
export function validatePreferences(preference?: Preference) {
  if (!preference) {
    return;
  }

  if (
    preference.keysUrl &&
    !['https://keys.coinbase.com/connect', 'https://keys-dev.coinbase.com/connect'].includes(
      preference.keysUrl
    )
  ) {
    throw new Error(`Invalid keysUrl: ${preference.keysUrl}`);
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
