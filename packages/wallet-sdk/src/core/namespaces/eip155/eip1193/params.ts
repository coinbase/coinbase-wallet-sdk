import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { WalletConnectParams } from ':core/rpc/wallet_connect.js';
import { ensureIntNumber } from ':core/type/util.js';
import { isRecord } from ':util/guards.js';
import { isAddress } from 'viem';

/** Readers for the dapp's EIP-1193 params, run once where the request enters the provider. */

/**
 * ERC-7846 `wallet_connect` as the dapp sent it. A missing or empty version defaults to `1`.
 * Capabilities pass through as sent; anything else on the request is dropped.
 */
export function parseWalletConnectParams(params: RequestArguments['params']): WalletConnectParams {
  const first = Array.isArray(params) ? params[0] : undefined;
  const value = isRecord(first) ? first : {};
  const version =
    typeof value.version === 'string' && value.version.length > 0 ? value.version : '1';
  return [
    { version, ...(isRecord(value.capabilities) ? { capabilities: value.capabilities } : {}) },
  ];
}

/**
 * EIP-3326 `wallet_switchEthereumChain`: `[{ chainId }]`, hex, one array and one object
 * deep. Returns the number the chain store keys on.
 */
export function parseSwitchChainId(params: RequestArguments['params']): number {
  if (!Array.isArray(params) || !params[0] || typeof params[0] !== 'object') {
    throw standardErrors.rpc.invalidParams(
      'wallet_switchEthereumChain - Invalid params: expected [{ chainId }]'
    );
  }
  return ensureIntNumber((params[0] as { chainId?: unknown }).chainId);
}

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
