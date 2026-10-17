import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/message/RequestArguments.js';
import { asRecord } from ':util/wire.js';
import { isCaip2 } from './caip.js';
import type { Caip27Error, Caip27Params, Envelope } from './types.js';

/** CAIP-27 JSON-RPC method used for every wallet invocation. */
export const WALLET_INVOKE_METHOD = 'wallet_invokeMethod';

const INVALID_RESULT = 'Invalid wallet_invokeMethod result:';

/**
 * Namespace-neutral JSON-RPC carrier put in the encrypted transport `action`.
 *
 * `Envelope` is already `Caip27Params`, so rebuilding it is normalization rather than a
 * copy: only these four fields reach the wire, whatever a namespace translator may have
 * attached to the envelope on its way here.
 */
export function createCaip27Request(envelope: Envelope): RequestArguments {
  const params: Caip27Params = {
    chainId: envelope.chainId,
    request: {
      method: envelope.request.method,
      params: envelope.request.params,
    },
    ...(envelope.capabilities ? { capabilities: envelope.capabilities } : {}),
    ...(envelope.sessionId ? { sessionId: envelope.sessionId } : {}),
  };
  return { method: WALLET_INVOKE_METHOD, params };
}

/**
 * Validate one decrypted CAIP-27 reply and hand back the method's result.
 *
 * A method-level error is thrown rather than returned: to the caller it is the outcome
 * of the call they made, not a value to inspect. Top-level transport and session errors
 * are thrown by the transport before this.
 */
export function readCaip27Result(value: unknown, request: Envelope): unknown {
  const record = asRecord(value);
  if (!record) {
    throw standardErrors.rpc.internal(`${INVALID_RESULT} response must be an object`);
  }

  // A reply is only ours if it names the chain we asked on and the session we asked under.
  if (
    !isCaip2(request.chainId) ||
    typeof record.chainId !== 'string' ||
    !isCaip2(record.chainId) ||
    record.chainId !== request.chainId
  ) {
    throw standardErrors.rpc.internal(`${INVALID_RESULT} chainId does not match the request`);
  }
  if (
    record.sessionId !== undefined &&
    (typeof record.sessionId !== 'string' || record.sessionId.length === 0)
  ) {
    throw standardErrors.rpc.internal(`${INVALID_RESULT} sessionId must be a non-empty string`);
  }
  if (request.sessionId !== record.sessionId) {
    throw standardErrors.rpc.internal(`${INVALID_RESULT} sessionId does not match the request`);
  }

  // JSON-RPC allows exactly one outcome.
  const hasResult = Object.prototype.hasOwnProperty.call(record, 'result');
  const hasError = Object.prototype.hasOwnProperty.call(record, 'error');
  if (hasResult === hasError) {
    throw standardErrors.rpc.internal(
      `${INVALID_RESULT} response must contain exactly one of result or error`
    );
  }

  if (hasError) {
    const error = asRecord(record.error);
    if (
      !error ||
      typeof error.code !== 'number' ||
      !Number.isInteger(error.code) ||
      typeof error.message !== 'string' ||
      error.message.length === 0
    ) {
      throw standardErrors.rpc.internal(`${INVALID_RESULT} error must be a JSON-RPC error`);
    }
    const methodError: Caip27Error = {
      code: error.code,
      message: error.message,
      ...('data' in error ? { data: error.data } : {}),
    };
    throw methodError;
  }

  const result = asRecord(record.result);
  if (
    !result ||
    result.method !== request.request.method ||
    !Object.prototype.hasOwnProperty.call(result, 'result')
  ) {
    throw standardErrors.rpc.internal(
      `${INVALID_RESULT} result must contain the requested method and its result`
    );
  }
  return result.result;
}
