import { PACKAGE_VERSION } from ':core/constants.js';
import { standardErrorCodes } from './constants.js';
import { serialize } from './utils.js';

/**
 * Serializes an error to a format that is compatible with the Ethereum JSON RPC error format.
 * See https://docs.cloud.coinbase.com/wallet-sdk/docs/errors
 * for more information.
 */
export function serializeError(error: unknown) {
  const serialized = serialize(getErrorObject(error), {
    shouldIncludeStack: true,
  });

  const docUrl = new URL('https://docs.cloud.coinbase.com/wallet-sdk/docs/errors');
  docUrl.searchParams.set('version', PACKAGE_VERSION);
  docUrl.searchParams.set('code', serialized.code.toString());
  docUrl.searchParams.set('message', serialized.message);

  return {
    ...serialized,
    docUrl: docUrl.href,
  };
}

type ErrorResponse = {
  method: unknown;
  errorCode?: number;
  errorMessage: string;
};

function isErrorResponse(response: unknown): response is ErrorResponse {
  return (response as ErrorResponse).errorMessage !== undefined;
}

/**
 * Converts an error to a serializable object.
 */
function getErrorObject(error: string | ErrorResponse | unknown) {
  if (typeof error === 'string') {
    return {
      message: error,
      code: standardErrorCodes.rpc.internal,
    };
  }
  if (isErrorResponse(error)) {
    const message = error.errorMessage;
    const code =
      error.errorCode ??
      (message.match(/(denied|rejected)/i)
        ? standardErrorCodes.provider.userRejectedRequest
        : undefined);

    return {
      ...error,
      message,
      code,
      data: { method: error.method },
    };
  }
  return error;
}
