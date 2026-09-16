import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { FetchPermissionsRequest } from ':core/rpc/coinbase_fetchSpendPermissions.js';
import { isAddress } from 'viem';

/**
 * Parameter validation for EIP-1193 methods the provider answers locally.
 *
 * These moved out of the removed sub-account module; neither is sub-account policy.
 */

/** EIP-5792 `wallet_getCapabilities`: `[account]` or `[account, chainIds]`. */
export function assertGetCapabilitiesParams(
  params: unknown
): asserts params is [`0x${string}`, `0x${string}`[]?] {
  if (!params || !Array.isArray(params) || (params.length !== 1 && params.length !== 2)) {
    throw standardErrors.rpc.invalidParams();
  }

  if (typeof params[0] !== 'string' || !isAddress(params[0])) {
    throw standardErrors.rpc.invalidParams();
  }

  if (params.length === 2) {
    if (!Array.isArray(params[1])) {
      throw standardErrors.rpc.invalidParams();
    }

    for (const param of params[1]) {
      if (typeof param !== 'string' || !param.startsWith('0x')) {
        throw standardErrors.rpc.invalidParams();
      }
    }
  }
}

/**
 * `coinbase_fetchPermissions` requires explicit params.
 *
 * The parameter-less form used to be filled in from the cached sub-account, which was
 * the only spender the SDK could infer. With sub-accounts gone there is nothing to
 * infer, so the caller supplies `account`, `chainId` and `spender`.
 */
export function assertFetchPermissionsRequest(
  request: RequestArguments
): asserts request is FetchPermissionsRequest {
  if (
    request.method !== 'coinbase_fetchPermissions' ||
    !Array.isArray(request.params) ||
    request.params.length !== 1 ||
    typeof request.params[0] !== 'object' ||
    request.params[0] === null
  ) {
    throw standardErrors.rpc.invalidParams(
      'FetchPermissions - Invalid params: expected [{ account, chainId, spender }]'
    );
  }

  const { account, chainId, spender } = request.params[0] as Record<string, unknown>;

  for (const [name, value] of [
    ['account', account],
    ['chainId', chainId],
    ['spender', spender],
  ] as const) {
    if (typeof value !== 'string' || !value.startsWith('0x')) {
      throw standardErrors.rpc.invalidParams(
        `FetchPermissions - Invalid params: params[0].${name} must be a hex string`
      );
    }
  }
}
