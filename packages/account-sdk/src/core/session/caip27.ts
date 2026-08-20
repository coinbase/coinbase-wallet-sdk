import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { type Caip2, isCaip2 } from './caip.js';
import { sessionCovers } from './covers.js';
import type { Caip27Params, Envelope, Session } from './types.js';

/** CAIP-27 JSON-RPC method. Dapp-facing; not sent to keys until protocol v2. */
export const WALLET_INVOKE_METHOD = 'wallet_invokeMethod';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
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

/** CAIP-27: `chainId` must already be authorized on the session. */
export function assertInvokeAuthorized(session: Session, envelope: Envelope): void {
  if (!sessionCovers(session, [envelope.chainId])) {
    throw standardErrors.provider.unauthorized(`chainId ${envelope.chainId} is not in the session`);
  }
}
