import { standardErrors } from ':core/error/errors.js';

export function assertPresence<T>(
  value: T,
  error?: Error,
  message?: string
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw (
      error ??
      standardErrors.rpc.invalidParams({
        message: message ?? 'value must be present',
        data: value,
      })
    );
  }
}

export function assertArrayPresence<T>(
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
