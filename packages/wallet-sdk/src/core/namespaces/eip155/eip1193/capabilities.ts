import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { Session } from ':core/session/index.js';
import { hexToNumber, isAddressEqual } from 'viem';
import { projectEip155Capabilities, projectEthAccountsForChain } from '../session.js';
import { assertGetCapabilitiesParams } from './params.js';

/** EIP-5792 "all chains" key. SDK always reports `gasLimitOverride` here (ERC-8132). */
export const ALL_CHAINS_KEY = '0x0';

const SDK_WILDCARD = {
  gasLimitOverride: { supported: true },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Merge CAIP-25 session capabilities with the SDK wildcard, then optionally
 * filter by chain id. `0x0` is always included.
 */
export function projectCapabilities(
  stored: Record<string, unknown>,
  filterChainIds?: `0x${string}`[]
): Record<string, unknown> {
  const wildcard = stored[ALL_CHAINS_KEY];
  const capabilities = {
    ...stored,
    [ALL_CHAINS_KEY]: {
      ...(isRecord(wildcard) ? wildcard : {}),
      ...SDK_WILDCARD,
    },
  };

  if (!filterChainIds || filterChainIds.length === 0) {
    return capabilities;
  }

  const filterChainNumbers = new Set(filterChainIds.map((chainId) => hexToNumber(chainId)));

  return Object.fromEntries(
    Object.entries(capabilities).filter(([capabilityKey]) => {
      if (capabilityKey === ALL_CHAINS_KEY) return true;
      try {
        return filterChainNumbers.has(hexToNumber(capabilityKey as `0x${string}`));
      } catch {
        return false;
      }
    })
  );
}

/**
 * ERC-5792 `wallet_getCapabilities`. Local projection of session-ingested
 * `account.capabilities` — not a popup round-trip and not chain JSON-RPC.
 */
export function getCapabilities(
  args: RequestArguments,
  session: Session,
  chainId: number
): Record<string, unknown> {
  assertGetCapabilitiesParams(args.params);

  const [requestedAccount, filterChainIds] = args.params;
  const accounts = projectEthAccountsForChain(session, chainId);

  if (!accounts.some((account) => isAddressEqual(account, requestedAccount))) {
    throw standardErrors.provider.unauthorized('no active account found when getting capabilities');
  }

  return projectCapabilities(projectEip155Capabilities(session), filterChainIds);
}
