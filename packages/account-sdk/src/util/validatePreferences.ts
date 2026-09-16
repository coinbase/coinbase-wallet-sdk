import { Preference } from ':core/provider/interface.js';

/**
 * Validates user supplied preferences. Throws if keys are not valid.
 * @param preference
 */
export function validatePreferences(preference?: Preference) {
  if (!preference) {
    return;
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
