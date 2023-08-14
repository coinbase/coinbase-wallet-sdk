import { errorValues, standardErrorCodes } from './constants.js';

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
export function isValidCode(code: number): boolean {
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

/**
 * Returns the error code from an error object.
 */
export function getErrorCode(error: unknown): number | undefined {
  if (typeof error === 'number') {
    return error;
  } else if (isErrorWithCode(error)) {
    return error.code ?? error.errorCode;
  }

  return undefined;
}

interface ErrorWithCode {
  code?: number;
  errorCode?: number;
}

function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return (
    typeof error === 'object' &&
    error !== null &&
    (typeof (error as ErrorWithCode).code === 'number' ||
      typeof (error as ErrorWithCode).errorCode === 'number')
  );
}

/**
 * Serializes the given error to an Ethereum JSON RPC-compatible error object.
 * Merely copies the given error's values if it is already compatible.
 * If the given error is not fully compatible, it will be preserved on the
 * returned object's data.originalError property.
 */

export interface SerializedEthereumRpcError {
  code: number; // must be an integer
  message: string;
  data?: unknown;
  stack?: string;
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
