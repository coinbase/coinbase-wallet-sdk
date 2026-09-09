import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { type Caip2, parseCaip2 } from './caip.js';
import { WALLET_CREATE_SESSION } from './caip25.js';
import type { Caip27Error, Caip27Params, Caip27Response, Envelope, Session } from './types.js';

/** CAIP-27 JSON-RPC method used for every wallet invocation. */
export const WALLET_INVOKE_METHOD = 'wallet_invokeMethod';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function namedParams(params: RequestArguments['params']): Record<string, unknown> {
  const direct = asRecord(params);
  if (direct) return direct;
  throw standardErrors.rpc.invalidParams('wallet_invokeMethod params must be an object');
}

function isEip155ChainId(value: unknown): value is Caip2 {
  if (typeof value !== 'string') return false;
  const parsed = parseCaip2(value);
  if (!parsed || parsed.namespace !== 'eip155' || !/^[1-9]\d*$/.test(parsed.reference)) {
    return false;
  }
  const chainId = Number(parsed.reference);
  return Number.isSafeInteger(chainId) && String(chainId) === parsed.reference;
}

function parseChainId(params: Record<string, unknown>): Caip2 {
  if (!isEip155ChainId(params.chainId)) {
    throw standardErrors.rpc.invalidParams('wallet_invokeMethod requires an eip155 CAIP-2 chainId');
  }
  return params.chainId;
}

function parseRequest(params: Record<string, unknown>): Caip27Params['request'] {
  const request = asRecord(params.request);
  if (!request || typeof request.method !== 'string' || request.method.length === 0) {
    throw standardErrors.rpc.invalidParams('wallet_invokeMethod.request.method is required');
  }
  if (request.method === WALLET_INVOKE_METHOD || request.method === WALLET_CREATE_SESSION) {
    throw standardErrors.rpc.invalidParams('nested CAIP carrier methods are not supported');
  }
  if (request.params === undefined) {
    throw standardErrors.rpc.invalidParams('wallet_invokeMethod.request.params is required');
  }
  if (!Array.isArray(request.params) && !asRecord(request.params)) {
    throw standardErrors.rpc.invalidParams(
      'wallet_invokeMethod.request.params must be an array or object'
    );
  }
  return {
    method: request.method,
    params: request.params as readonly unknown[] | object,
  };
}

/**
 * Parse a dapp-facing EIP-1193 `wallet_invokeMethod` call into CAIP-27 params.
 *
 * This edge parser currently accepts eip155 chains only. It is not the
 * namespace registry extension path; `invoke` selects translators from an
 * already-formed `Envelope`. Does not send on the wire.
 */
export function parseCaip27(args: RequestArguments): Caip27Params {
  if (args.method !== WALLET_INVOKE_METHOD) {
    throw standardErrors.rpc.invalidParams(`expected ${WALLET_INVOKE_METHOD}`);
  }
  const params = namedParams(args.params);
  const chainId = parseChainId(params);
  const request = parseRequest(params);

  let capabilities: Record<string, unknown> | undefined;
  if (params.capabilities !== undefined) {
    const parsed = asRecord(params.capabilities);
    if (!parsed) {
      throw standardErrors.rpc.invalidParams('wallet_invokeMethod.capabilities must be an object');
    }
    capabilities = parsed;
  }

  let sessionId: string | undefined;
  if (params.sessionId !== undefined) {
    if (typeof params.sessionId !== 'string' || params.sessionId.length === 0) {
      throw standardErrors.rpc.invalidParams(
        'wallet_invokeMethod.sessionId must be a non-empty string'
      );
    }
    sessionId = params.sessionId;
  }

  return {
    chainId,
    request,
    ...(capabilities ? { capabilities } : {}),
    ...(sessionId ? { sessionId } : {}),
  };
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
  if (!isEip155ChainId(record.chainId) || record.chainId !== request.chainId) {
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

/** CAIP-27 chain, method, and session id must be exactly authorized. */
export function assertInvokeAuthorized(session: Session, envelope: Envelope): void {
  const scope = session.scopes[envelope.chainId];
  if (!scope?.accounts.length) {
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
