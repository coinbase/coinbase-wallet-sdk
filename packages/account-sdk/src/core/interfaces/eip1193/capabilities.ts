import { standardErrors } from ':core/error/errors.js';
import type { RequestArguments } from ':core/provider/interface.js';
import { projectEthAccounts } from ':core/session/index.js';
import type { Session } from ':core/session/index.js';
import { orderedEthAccounts } from ':core/sub-account/index.js';
import { assertGetCapabilitiesParams } from ':core/sub-account/utils.js';
import type { WalletRuntime } from ':core/transport/index.js';
import type { Address } from ':core/type/index.js';
import { hexToNumber, isAddressEqual } from 'viem';

/** EIP-5792 "all chains" key. SDK always reports `gasLimitOverride` here (ERC-8132). */
export const ALL_CHAINS_KEY = '0x0';

const SDK_WILDCARD = {
  gasLimitOverride: { supported: true },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Merge handshake-ingested EIP-5792 maps with the SDK wildcard, then optionally
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
 * ERC-5792 `wallet_getCapabilities`. Local projection of handshake-ingested
 * `account.capabilities` — not a popup round-trip and not chain JSON-RPC.
 */
export function getCapabilities(
  runtime: WalletRuntime,
  args: RequestArguments,
  session: Session
): Record<string, unknown> {
  assertGetCapabilitiesParams(args.params);

  const [requestedAccount, filterChainIds] = args.params;
  const storeAccounts = (runtime.store.account.get().accounts ?? []) as Address[];
  const accounts = orderedEthAccounts(
    runtime,
    storeAccounts.length > 0 ? storeAccounts : projectEthAccounts(session)
  );

  if (!accounts.some((account) => isAddressEqual(account, requestedAccount))) {
    throw standardErrors.provider.unauthorized('no active account found when getting capabilities');
  }

  return projectCapabilities(
    (runtime.store.account.get().capabilities ?? {}) as Record<string, unknown>,
    filterChainIds
  );
}
