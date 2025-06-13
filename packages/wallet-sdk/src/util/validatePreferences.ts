import { Preference } from ':core/provider/interface.js';
import { ToOwnerAccountFn } from ':store/store.js';

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

  if (preference.telemetry) {
    if (typeof preference.telemetry !== 'boolean') {
      throw new Error(`Telemetry must be a boolean`);
    }
  }
}

/**
 * Validates user supplied toSubAccountSigner function. Throws if keys are not valid.
 * @param toAccount
 */
export function validateSubAccount(toAccount: ToOwnerAccountFn) {
  if (typeof toAccount !== 'function') {
    throw new Error(`toAccount is not a function`);
  }
}
