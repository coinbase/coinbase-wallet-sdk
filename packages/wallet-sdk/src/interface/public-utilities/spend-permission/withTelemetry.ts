import {
  SpendPermissionUtilType,
  logSpendPermissionUtilCompleted,
  logSpendPermissionUtilError,
  logSpendPermissionUtilStarted,
} from ':core/telemetry/events/spend-permission.js';
import { parseErrorMessageFromAny } from ':core/telemetry/utils.js';
import { store } from ':store/store.js';

// biome-ignore lint/suspicious/noExplicitAny: HOF
export function withTelemetry<T extends (...args: any[]) => any>(fn: T) {
  // Honor the telemetry preference
  const config = store.config.get();
  if (config.preference?.telemetry === false) {
    return fn;
  }

  return (...args: Parameters<T>): ReturnType<T> => {
    const functionName = getFunctionName(fn);
    logSpendPermissionUtilStarted(functionName);
    try {
      const result = fn(...args);
      logSpendPermissionUtilCompleted(functionName);
      return result;
    } catch (error) {
      logSpendPermissionUtilError(functionName, parseErrorMessageFromAny(error));
      throw error;
    }
  };
}

// biome-ignore lint/suspicious/noExplicitAny: HOF helper
function getFunctionName(fn: (...args: any[]) => any): SpendPermissionUtilType {
  return fn.name.replace('Fn', '') as SpendPermissionUtilType;
}
