// eslint-disable-next-line no-restricted-imports
import {
  errorCodes,
  EthereumProviderError,
  ethErrors,
  getMessageFromCode,
  serializeError as serialize,
} from "eth-rpc-errors";

import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK";
import { JSONRPCRequest } from "./provider/JSONRPC";
import { isErrorResponse } from "./relay/Web3Response";

// ----------------- standard errors -----------------

declare type StandardErrorsType = typeof ethErrors & {
  provider: {
    unsupportedChain: (
      chainId?: string | number,
    ) => EthereumProviderError<undefined>;
  };
};

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

export const standardErrors: StandardErrorsType = Object.freeze({
  ...ethErrors,
  provider: Object.freeze({
    ...ethErrors.provider,
    unsupportedChain: (chainId: string | number = "") =>
      ethErrors.provider.custom<undefined>({
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

export type ErrorType = Error | SerializedError;
export type ErrorHandler = (error?: ErrorType) => void;

/**
 * Serializes an error to a format that is compatible with the Ethereum JSON RPC error format.
 * See https://docs.cloud.coinbase.com/wallet-sdk/docs/errors
 * for more information.
 */
export function serializeError(
  error: unknown,
  requestOrMethod?: JSONRPCRequest | JSONRPCRequest[] | string,
): SerializedError {
  const serialized = serialize(getErrorObject(error), {
    shouldIncludeStack: true,
  });

  const docUrl = new URL(
    "https://docs.cloud.coinbase.com/wallet-sdk/docs/errors",
  );
  docUrl.searchParams.set("version", CoinbaseWalletSDK.VERSION);
  docUrl.searchParams.set("code", serialized.code.toString());
  const method = getMethod(serialized.data, requestOrMethod);
  if (method) {
    docUrl.searchParams.set("method", method);
  }
  docUrl.searchParams.set("message", serialized.message);

  return {
    ...serialized,
    docUrl: docUrl.href,
  };
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
 * Gets the method name from the serialized data or the request.
 */
function getMethod(
  serializedData: unknown,
  request?: JSONRPCRequest | JSONRPCRequest[] | string,
): string | undefined {
  const methodInData = (serializedData as { method: string })?.method;
  if (methodInData) {
    return methodInData;
  }

  if (request === undefined) {
    return undefined;
  } else if (typeof request === "string") {
    return request;
  } else if (!Array.isArray(request)) {
    return request.method;
  } else if (request.length > 0) {
    return request[0].method;
  } else {
    return undefined;
  }
}

// ----------------- getErrorCode -----------------

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
