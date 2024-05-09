import { errorValues, standardErrorCodes } from './constants';
import { SerializedEthereumRpcError } from './type';

const FALLBACK_MESSAGE = 'Unspecified error message.';

export const JSON_RPC_SERVER_ERROR_MESSAGE = 'Unspecified server error.';

type ErrorValueKey = keyof typeof errorValues;

/**
 * Gets the message for a given code, or a fallback message if the code has
 * no corresponding message.
 */
export function getMessageFromCode(
  code: number | undefined,
  fallbackMessage: string = FALLBACK_MESSAGE
): string {
  if (code && Number.isInteger(code)) {
    const codeString = code.toString();

    if (hasKey(errorValues, codeString)) {
      return errorValues[codeString as ErrorValueKey].message;
    }
    if (isJsonRpcServerError(code)) {
      return JSON_RPC_SERVER_ERROR_MESSAGE;
    }
  }
  return fallbackMessage;
}

/**
 * Returns whether the given code is valid.
 * A code is only valid if it has a message.
 */
function isValidCode(code: number): boolean {
  if (!Number.isInteger(code)) {
    return false;
  }

  const codeString = code.toString();
  if (errorValues[codeString as ErrorValueKey]) {
    return true;
  }

  if (isJsonRpcServerError(code)) {
    return true;
  }
  return false;
}

export function serialize(
  error: unknown,
  { shouldIncludeStack = false } = {}
): SerializedEthereumRpcError {
  const serialized: Partial<SerializedEthereumRpcError> = {};

  if (
    error &&
    typeof error === 'object' &&
    !Array.isArray(error) &&
    hasKey(error as Record<string, unknown>, 'code') &&
    isValidCode((error as SerializedEthereumRpcError).code)
  ) {
    const _error = error as Partial<SerializedEthereumRpcError>;
    serialized.code = _error.code;

    if (_error.message && typeof _error.message === 'string') {
      serialized.message = _error.message;

      if (hasKey(_error, 'data')) {
        serialized.data = _error.data;
      }
    } else {
      serialized.message = getMessageFromCode((serialized as SerializedEthereumRpcError).code);

      serialized.data = { originalError: assignOriginalError(error) };
    }
  } else {
    serialized.code = standardErrorCodes.rpc.internal;

    serialized.message = hasStringProperty(error, 'message') ? error.message : FALLBACK_MESSAGE;
    serialized.data = { originalError: assignOriginalError(error) };
  }

  if (shouldIncludeStack) {
    serialized.stack = hasStringProperty(error, 'stack') ? error.stack : undefined;
  }
  return serialized as SerializedEthereumRpcError;
}

// Internal

function isJsonRpcServerError(code: number): boolean {
  return code >= -32099 && code <= -32000;
}

function assignOriginalError(error: unknown): unknown {
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    return Object.assign({}, error);
  }
  return error;
}

function hasKey(obj: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function hasStringProperty<T>(obj: unknown, prop: keyof T): obj is T {
  return (
    typeof obj === 'object' && obj !== null && prop in obj && typeof (obj as T)[prop] === 'string'
  );
}
