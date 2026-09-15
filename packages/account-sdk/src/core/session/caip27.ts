import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/message/RequestArguments.js';
import { type Caip2, isCaip2 } from './caip.js';
import { grantFor } from './grants.js';
import type { Caip27Error, Caip27Params, Caip27Response, Envelope, Session } from './types.js';

/** CAIP-27 JSON-RPC method used for every wallet invocation. */
export const WALLET_INVOKE_METHOD = 'wallet_invokeMethod';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/** CAIP-27 params for the wallet wire. */
export function toCaip27(envelope: Envelope): Caip27Params {
  return {
    chainId: envelope.chainId,
    request: {
      method: envelope.request.method,
      params: envelope.request.params,
    },
    ...(envelope.capabilities ? { capabilities: envelope.capabilities } : {}),
    ...(envelope.sessionId ? { sessionId: envelope.sessionId } : {}),
  };
}

/** Namespace-neutral JSON-RPC carrier put in the encrypted transport `action`. */
export function createCaip27Request(envelope: Envelope): RequestArguments {
  return {
    method: WALLET_INVOKE_METHOD,
    params: toCaip27(envelope),
  };
}

function responseError(value: unknown): Caip27Error | null {
  const error = asRecord(value);
  if (
    !error ||
    !Number.isInteger(error.code) ||
    typeof error.message !== 'string' ||
    error.message.length === 0
  ) {
    return null;
  }
  return {
    code: error.code as number,
    message: error.message,
    ...('data' in error ? { data: error.data } : {}),
  };
}

/**
 * Validate the decrypted CAIP-27 result envelope against its issued request.
 * Top-level transport/session errors are thrown by the transport before this.
 */
export function parseCaip27Response(value: unknown, request: Envelope): Caip27Response {
  const invalid = (message: string): never => {
    throw standardErrors.rpc.internal(`Invalid wallet_invokeMethod result: ${message}`);
  };
  const response = asRecord(value);
  if (!response) invalid('response must be an object');
  const record = response as Record<string, unknown>;
  if (
    !isCaip2(request.chainId) ||
    typeof record.chainId !== 'string' ||
    !isCaip2(record.chainId) ||
    record.chainId !== request.chainId
  ) {
    invalid('chainId does not match the request');
  }

  let sessionId: string | undefined;
  if (record.sessionId !== undefined) {
    if (typeof record.sessionId !== 'string' || record.sessionId.length === 0) {
      invalid('sessionId must be a non-empty string');
    }
    sessionId = record.sessionId as string;
  }
  if (request.sessionId !== sessionId) {
    invalid('sessionId does not match the request');
  }

  const hasResult = Object.prototype.hasOwnProperty.call(record, 'result');
  const hasError = Object.prototype.hasOwnProperty.call(record, 'error');
  if (hasResult === hasError) invalid('response must contain exactly one of result or error');

  if (hasError) {
    const error = responseError(record.error);
    if (!error) invalid('error must be a JSON-RPC error');
    return {
      ...(sessionId ? { sessionId } : {}),
      chainId: record.chainId as Caip2,
      error: error as Caip27Error,
    };
  }

  const result = asRecord(record.result);
  if (
    !result ||
    result.method !== request.request.method ||
    !Object.prototype.hasOwnProperty.call(result, 'result')
  ) {
    invalid('result must contain the requested method and its result');
  }
  const parsedResult = result as Record<string, unknown>;
  return {
    ...(sessionId ? { sessionId } : {}),
    chainId: record.chainId as Caip2,
    result: {
      method: parsedResult.method as string,
      result: parsedResult.result,
    },
  };
}

/** Return a method result or throw a method-level error from the CAIP-27 envelope. */
export function unwrapCaip27Response(response: Caip27Response): unknown {
  if ('error' in response) throw response.error;
  return response.result.result;
}

/**
 * CAIP-27 chain, method, and session id must be authorized.
 *
 * The chain is authorized by an exact chain grant or by a grant on its whole
 * namespace; `grantFor` resolves both. Chains the wallet does not support are
 * rejected by the wallet, not invented as an authorization failure here.
 */
export function assertInvokeAuthorized(session: Session, envelope: Envelope): void {
  const scope = grantFor(session, envelope.chainId);
  if (!scope) {
    throw standardErrors.provider.unauthorized(`chainId ${envelope.chainId} is not in the session`);
  }
  if (!scope.methods.includes(envelope.request.method)) {
    throw standardErrors.provider.unauthorized(
      `method ${envelope.request.method} is not authorized for ${envelope.chainId}`
    );
  }
  if (envelope.sessionId !== undefined && envelope.sessionId !== session.sessionId) {
    throw standardErrors.provider.unauthorized('sessionId does not match the active session');
  }
}
