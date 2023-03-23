// eslint-disable-next-line no-restricted-imports
import {
  errorCodes,
  ethErrors,
  getMessageFromCode,
  serializeError as serialize,
} from "eth-rpc-errors";

import { CoinbaseWalletSDK } from "./CoinbaseWalletSDK";

export const standardErrorCodes = {
  ...errorCodes,
  provider: {
    ...errorCodes.provider,
    unsupportedChain: 4902, // To-be-standardized "unrecognized chain ID" error
  },
};

export function standardErrorMessage(code?: number): string {
  return code ? getMessageFromCode(code) : "Unknown error";
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
  const serialized = serialize(
    typeof error === "string" ? new Error(error) : error,
    { shouldIncludeStack: true },
  );

  const version: string = CoinbaseWalletSDK.VERSION;
  const docUrl = `https://docs.cloud.coinbase.com/wallet-sdk/docs/errors?code=${serialized.code}&version=${version}`;

  serialized.data = {
    ...Object(serialized.data),
    version,
    docUrl,
  };

  return serialized;
}
