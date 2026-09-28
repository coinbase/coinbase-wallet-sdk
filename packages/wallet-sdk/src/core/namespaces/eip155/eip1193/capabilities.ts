import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import type { Session } from ':core/session/index.js';
import { hexToNumber, isAddressEqual } from 'viem';
import { projectEip155Capabilities, projectEthAccounts } from '../session.js';
import { assertGetCapabilitiesParams } from './params.js';

/**
 * EIP-5792 "all chains" key.
 *
 * Whatever the wallet reports here holds on every chain, so it survives any filter.
 * The SDK adds nothing of its own: a capability is the wallet's to claim, and
 * claiming one the wallet cannot serve fails at send time instead of here.
 */
export const ALL_CHAINS_KEY = '0x0';

/** Narrow session capabilities to the requested chains, keeping the all-chains entry. */
export function projectCapabilities(
  stored: Record<string, unknown>,
  filterChainIds?: `0x${string}`[]
): Record<string, unknown> {
  if (!filterChainIds || filterChainIds.length === 0) {
    return stored;
  }

  const filterChainNumbers = new Set(filterChainIds.map((chainId) => hexToNumber(chainId)));

  return Object.fromEntries(
    Object.entries(stored).filter(([capabilityKey]) => {
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
 * ERC-5792 `wallet_getCapabilities`. Local projection of what the wallet already
 * reported at connect time — not a popup round-trip and not chain JSON-RPC.
 */
export function getCapabilities(args: RequestArguments, session: Session): Record<string, unknown> {
  assertGetCapabilitiesParams(args.params);

  const [requestedAccount, filterChainIds] = args.params;
  const accounts = projectEthAccounts(session);

  if (!accounts.some((account) => isAddressEqual(account, requestedAccount))) {
    throw standardErrors.provider.unauthorized('no active account found when getting capabilities');
  }

  return projectCapabilities(projectEip155Capabilities(session), filterChainIds);
}
