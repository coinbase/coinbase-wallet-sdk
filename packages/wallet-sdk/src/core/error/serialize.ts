// TODO: error should not depend on walletlink. revisit this.
import { isErrorResponse, Web3Response } from '../../sign/walletlink/relay/type/Web3Response';
import { LIB_VERSION } from '../../version';
import { standardErrorCodes } from './constants';
import { serialize } from './utils';

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
  docUrl.searchParams.set('version', LIB_VERSION);
  docUrl.searchParams.set('code', serialized.code.toString());
  docUrl.searchParams.set('message', serialized.message);

  return {
    ...serialized,
    docUrl: docUrl.href,
  };
}

/**
 * Converts an error to a serializable object.
 */
function getErrorObject(error: string | Web3Response | unknown) {
  if (typeof error === 'string') {
    return {
      message: error,
      code: standardErrorCodes.rpc.internal,
    };
  } else if (isErrorResponse(error)) {
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
