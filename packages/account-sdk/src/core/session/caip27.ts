import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { type Caip2, isCaip2, parseCaip2 } from './caip.js';
import { sessionCovers } from './covers.js';
import type { Caip27Error, Caip27Params, Caip27Response, Envelope, Session } from './types.js';

/** CAIP-27 JSON-RPC method. Dapp-facing; not sent to keys until protocol v2. */
export const WALLET_INVOKE_METHOD = 'wallet_invokeMethod';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
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

/** Named CAIP-27 params, or EIP-1193-style `[{ ... }]`. */
function namedParams(params: RequestArguments['params']): Record<string, unknown> {
  const direct = asRecord(params);
  if (direct) return direct;
  if (Array.isArray(params)) {
    const first = asRecord(params[0]);
    if (first) return first;
  }
  throw standardErrors.rpc.invalidParams('wallet_invokeMethod params must be an object');
}

function parseChainId(params: Record<string, unknown>): Caip2 {
  // CAIP-27 uses `chainId`; MetaMask MIP-5 uses `scope` for the same CAIP-2.
  const raw = params.chainId ?? params.scope;
  if (typeof raw !== 'string' || !isCaip2(raw)) {
    throw standardErrors.rpc.invalidParams('wallet_invokeMethod requires a CAIP-2 chainId');
  }
  return raw;
}

function parseRequest(params: Record<string, unknown>): Caip27Params['request'] {
  const request = asRecord(params.request);
  if (!request || typeof request.method !== 'string' || request.method.length === 0) {
    throw standardErrors.rpc.invalidParams('wallet_invokeMethod.request.method is required');
  }
  if (request.method === WALLET_INVOKE_METHOD) {
    throw standardErrors.rpc.invalidParams('nested wallet_invokeMethod is not supported');
  }
  return { method: request.method, params: request.params ?? [] };
}

/**
 * Parse a dapp `wallet_invokeMethod` call into CAIP-27 params.
 * Does not send on the wire.
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
    if (typeof params.sessionId !== 'string') {
      throw standardErrors.rpc.invalidParams('wallet_invokeMethod.sessionId must be a string');
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

/**
 * CAIP-27 params for keys protocol v2.
 * Popup still uses `toLegacyRequest` (v1) today.
 */
export function toCaip27(envelope: Envelope): Caip27Params {
  return {
    chainId: envelope.chainId,
    request: {
      method: envelope.request.method,
      params: envelope.request.params ?? [],
    },
    ...(envelope.capabilities ? { capabilities: envelope.capabilities } : {}),
    ...(envelope.sessionId ? { sessionId: envelope.sessionId } : {}),
  };
}

/**
 * Build the namespace-neutral CAIP-27 JSON-RPC carrier.
 *
 * This codec is intentionally not wired into popup transport yet; protocol v1
 * continues to use `toLegacyRequest` until the runtime cutover.
 */
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
 * Validate a decrypted eip155 CAIP-27 response against its issued request.
 *
 * Malformed wallet responses are internal RPC errors because the dapp request
 * has already crossed the validated boundary. Transport/session errors are
 * handled before this method-level response envelope.
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

/** Return a method result or preserve and throw the wallet's method-level error. */
export function unwrapCaip27Response(response: Caip27Response): unknown {
  if ('error' in response) throw response.error;
  return response.result.result;
}

/** CAIP-27: `chainId` must already be authorized on the session. */
export function assertInvokeAuthorized(session: Session, envelope: Envelope): void {
  if (!sessionCovers(session, [envelope.chainId])) {
    throw standardErrors.provider.unauthorized(`chainId ${envelope.chainId} is not in the session`);
  }
}
