import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { type Caip2, parseCaip2 } from ':core/session/caip.js';
import { WALLET_CREATE_SESSION } from ':core/session/caip25.js';
import { WALLET_INVOKE_METHOD } from ':core/session/caip27.js';
import type { Caip27Params } from ':core/session/types.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function parseChainId(value: unknown): Caip2 {
  if (typeof value === 'string') {
    const parsed = parseCaip2(value);
    if (parsed?.namespace === 'eip155' && /^[1-9]\d*$/.test(parsed.reference)) {
      const chainId = Number(parsed.reference);
      if (Number.isSafeInteger(chainId) && String(chainId) === parsed.reference) {
        return value as Caip2;
      }
    }
  }
  throw standardErrors.rpc.invalidParams('wallet_invokeMethod requires an eip155 CAIP-2 chainId');
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

/** Parse a dapp-facing EIP-1193 wallet_invokeMethod call into CAIP-27 params. */
export function parseCaip27(args: RequestArguments): Caip27Params {
  if (args.method !== WALLET_INVOKE_METHOD) {
    throw standardErrors.rpc.invalidParams(`expected ${WALLET_INVOKE_METHOD}`);
  }
  const params = asRecord(args.params);
  if (!params) {
    throw standardErrors.rpc.invalidParams('wallet_invokeMethod params must be an object');
  }
  const chainId = parseChainId(params.chainId);
  const request = parseRequest(params);

  let capabilities: Record<string, unknown> | undefined;
  if (params.capabilities !== undefined) {
    capabilities = asRecord(params.capabilities) ?? undefined;
    if (!capabilities) {
      throw standardErrors.rpc.invalidParams('wallet_invokeMethod.capabilities must be an object');
    }
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
