// eslint-disable-next-line no-restricted-imports
import {
  errorCodes,
  ethErrors,
  getMessageFromCode,
  serializeError as serialize,
} from "eth-rpc-errors";

import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK";
import { isErrorResponse } from "./relay/Web3Response";

// ----------------- standard errors -----------------

export const standardErrorCodes = Object.freeze({
  ...errorCodes,
  provider: Object.freeze({
    ...errorCodes.provider,
    unsupportedChain: 4902, // To-be-standardized "unrecognized chain ID" error
  }),
});

export function standardErrorMessage(code: number | undefined): string {
  return code !== undefined ? getMessageFromCode(code) : "Unknown error";
}

export const standardErrors = Object.freeze({
  ...ethErrors,
  provider: Object.freeze({
    ...ethErrors.provider,
    unsupportedChain: (chainId: string | number = "") =>
      ethErrors.provider.custom({
        code: standardErrorCodes.provider.unsupportedChain,
        message: `Unrecognized chain ID ${chainId}. Try adding the chain using wallet_addEthereumChain first.`,
      }),
  }),
});

// ----------------- serializeError -----------------

interface SerializedError {
  code: number;
  message: string;
  docUrl: string;
  data?: unknown;
  stack?: string;
}

/**
 * Converts an error to a serializable object.
 */
function getErrorObject(error: unknown) {
  if (typeof error === "string") {
    return {
      message: error,
      code: standardErrorCodes.rpc.internal,
    };
  } else if (isErrorResponse(error)) {
    return {
      ...error,
      message: error.errorMessage,
      code: error.errorCode,
      data: { method: error.method, result: error.result },
    };
  } else {
    return error;
  }
}

/**
 * Serializes an error to a format that is compatible with the Ethereum JSON RPC error format.
 * See https://docs.cloud.coinbase.com/wallet-sdk/docs/errors
 * for more information.
 */
export function serializeError(error: unknown): SerializedError {
  const serialized = serialize(getErrorObject(error), {
    shouldIncludeStack: true,
  });

  const docUrl = new URL(
    "https://docs.cloud.coinbase.com/wallet-sdk/docs/errors",
  );
  docUrl.searchParams.set("version", CoinbaseWalletSDK.VERSION);
  docUrl.searchParams.set("code", serialized.code.toString());
  docUrl.searchParams.set("message", serialized.message);
  const method = (serialized.data as { method: string })?.method;
  if (method) {
    docUrl.searchParams.set("method", method);
  }

  return {
    ...serialized,
    docUrl: docUrl.href,
  };
}

// ----------------- getErrorCode -----------------

interface ErrorWithCode {
  code?: number;
  errorCode?: number;
}

function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return (
    typeof error === "object" &&
    error !== null &&
    (typeof (error as ErrorWithCode).code === "number" ||
      typeof (error as ErrorWithCode).errorCode === "number")
  );
}

/**
 * Returns the error code from an error object.
 */
export function getErrorCode(error: unknown): number | undefined {
  if (typeof error === "number") {
    return error;
  } else if (isErrorWithCode(error)) {
    return error.code ?? error.errorCode;
  }

  return undefined;
}
