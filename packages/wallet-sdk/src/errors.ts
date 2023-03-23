// eslint-disable-next-line no-restricted-imports
import {
  errorCodes,
  ethErrors,
  getMessageFromCode,
  serializeError as serialize,
} from "eth-rpc-errors";

import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK";
import { isErrorResponse } from "./relay/Web3Response";

export const standardErrorCodes = {
  ...errorCodes,
  provider: {
    ...errorCodes.provider,
    unsupportedChain: 4902, // To-be-standardized "unrecognized chain ID" error
  },
};

export function standardErrorMessage(code: number | undefined): string {
  return code !== undefined ? getMessageFromCode(code) : "Unknown error";
}

export const standardErrors = {
  ...ethErrors,
  provider: {
    ...ethErrors.provider,
    unsupportedChain: (chainId: string | number = "") =>
      ethErrors.provider.custom({
        code: standardErrorCodes.provider.unsupportedChain,
        message: `Unrecognized chain ID ${chainId}. Try adding the chain using wallet_addEthereumChain first.`,
      }),
  },
};

export function serializeError(error: unknown) {
  const errorObject = (() => {
    if (typeof error === "string") return new Error(error);

    if (isErrorResponse(error))
      return {
        ...error,
        message: error.errorMessage,
        code: error.errorCode,
      };

    return error;
  })();
  const serialized = serialize(errorObject, { shouldIncludeStack: true });

  const version: string = CoinbaseWalletSDK.VERSION;
  const docUrl = `https://docs.cloud.coinbase.com/wallet-sdk/docs/errors?code=${serialized.code}&version=${version}`;

  serialized.data = {
    ...Object(serialized.data),
    version,
    docUrl,
  };

  return serialized;
}

interface ErrorWithCode {
  code?: number;
  errorCode?: number;
}

function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "errorCode" in error)
  );
}

export function getErrorCode(error: unknown): number | undefined {
  if (typeof error === "number") {
    return error;
  } else if (isErrorWithCode(error)) {
    if (typeof error.code === "number") {
      return error.code;
    } else if (typeof error.errorCode === "number") {
      return error.errorCode;
    }
  }

  return undefined;
}
