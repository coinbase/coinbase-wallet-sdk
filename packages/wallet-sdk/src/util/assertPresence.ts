import { standardErrors } from ':core/error/errors.js';

export function assetPresence<T>(value: T, message?: string): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw standardErrors.rpc.invalidParams({
      message: message ?? 'value must be present',
      data: value,
    });
  }
}

export function assetArrayPresence<T>(
  value: unknown,
  message?: string
): asserts value is NonNullable<T>[] {
  if (!Array.isArray(value)) {
    throw standardErrors.rpc.invalidParams({
      message: message ?? 'value must be an array',
      data: value,
    });
  }
}
