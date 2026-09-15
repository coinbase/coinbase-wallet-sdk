import { Address } from ':core/type/index.js';
import { type Caip2, accountOf } from ':core/session/caip.js';
import { accountsFor, grantFor, grantsInNamespace } from ':core/session/grants.js';
import type { Session } from ':core/session/types.js';
import type { SDKChain } from './client/index.js';
import { isAddress, numberToHex } from 'viem';
import { eip155Caip2, eip155ChainId, formatEip155Account } from './caip.js';

/** Default methods requested in an eip155 CAIP-25 session scope. */
export const EIP155_METHODS = [
  'eth_accounts',
  'personal_sign',
  'personal_ecRecover',
  'eth_ecRecover',
  'eth_sendTransaction',
  'eth_signTransaction',
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_sendCalls',
  'wallet_showCallsStatus',
  'wallet_sign',
  'wallet_grantPermissions',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
  'wallet_watchAsset',
  'wallet_connect',
  'wallet_addSubAccount',
  'experimental_requestInfo',
] as const;

/**
 * Build a Session from a flat eip155 address list.
 *
 * Used for internal tests and local session state.
 */
export function sessionFromAccounts(opts: {
  accounts: Address[];
  chainId: number;
}): Session {
  const chainId = eip155Caip2(opts.chainId);
  const accounts = opts.accounts.map((address) => formatEip155Account(opts.chainId, address));
  return {
    scopes: {
      [chainId]: { accounts, methods: [...EIP155_METHODS] },
    },
  };
}

/**
 * eip155 addresses only, across every eip155 grant. Solana / bip122 never appear here.
 *
 * Chain-keyed grants hold CAIP-10 ids and namespace grants hold raw addresses;
 * `accountOf` normalizes both.
 */
export function projectEthAccounts(session: Session): Address[] {
  const seen = new Set<string>();
  const addresses: Address[] = [];

  for (const [, scope] of grantsInNamespace(session, 'eip155')) {
    for (const account of scope.accounts) {
      const address = accountOf(account);
      if (!isAddress(address)) continue;
      const key = address.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      addresses.push(address as Address);
    }
  }
  return addresses;
}

/** EIP-155 addresses authorized on one chain, preserving wallet order. */
export function projectEthAccountsForChain(session: Session, chainId: number): Address[] {
  return accountsFor(session, eip155Caip2(chainId)).flatMap((address) =>
    isAddress(address) ? [address as Address] : []
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function parseRpcUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

function parseNativeCurrency(value: unknown): SDKChain['nativeCurrency'] | undefined {
  if (!isRecord(value)) return undefined;
  const { name, symbol, decimal } = value;
  if (
    typeof name !== 'string' ||
    typeof symbol !== 'string' ||
    !Number.isInteger(decimal) ||
    (decimal as number) < 0
  ) {
    return undefined;
  }
  return { name, symbol, decimal: decimal as number };
}

/** Wallet-provided EIP-155 chain metadata from CAIP-25 session properties. */
export function projectEip155ChainMetadata(session: Session): SDKChain[] {
  const metadata = session.properties?.chainMetadata;
  if (!isRecord(metadata)) return [];

  return Object.entries(metadata).flatMap(([caip2, value]) => {
    const id = eip155ChainId(caip2 as `eip155:${string}`);
    const entry = isRecord(value) ? value : undefined;
    if (id === null || !entry) return [];

    const rpcUrl = parseRpcUrl(entry.rpcUrl);
    const nativeCurrency = parseNativeCurrency(entry.nativeCurrency);
    if (!rpcUrl && !nativeCurrency) return [];
    return [{ id, ...(rpcUrl ? { rpcUrl } : {}), ...(nativeCurrency ? { nativeCurrency } : {}) }];
  });
}

export function rpcUrlForEip155Chain(session: Session, chainId: number): string | undefined {
  return projectEip155ChainMetadata(session).find((chain) => chain.id === chainId)?.rpcUrl;
}

/** True when a chain is already granted or described by the wallet's chain catalog. */
export function isKnownEip155Chain(session: Session, chainId: number): boolean {
  return (
    grantFor(session, eip155Caip2(chainId)) !== undefined ||
    projectEip155ChainMetadata(session).some((chain) => chain.id === chainId)
  );
}

/**
 * EIP-5792 capabilities keyed by hex chain id.
 *
 * A namespace grant is not chain-specific, so its capabilities are reported under the
 * EIP-5792 all-chains key (`0x0`). Per-chain wallet capabilities arrive as chain-keyed
 * grants or in `properties.chainMetadata`.
 */
export function projectEip155Capabilities(session: Session): Record<string, unknown> {
  return Object.fromEntries(
    grantsInNamespace(session, 'eip155').flatMap(([scopeKey, scope]) => {
      if (!scope.capabilities) return [];
      const chainId = eip155ChainId(scopeKey as Caip2);
      return [[chainId === null ? '0x0' : numberToHex(chainId), scope.capabilities]];
    })
  );
}

/**
 * First chain-keyed EIP-155 grant in wallet response order.
 *
 * A session whose only eip155 grant is namespace-wide has no such chain: the caller
 * already knows which chain it wants, and `grantFor` authorizes it.
 */
export function firstEip155ChainId(session: Session): number | undefined {
  for (const [id, scope] of Object.entries(session.scopes)) {
    const chainId = eip155ChainId(id as Caip2);
    if (chainId !== null && scope.accounts.length > 0) return chainId;
  }
  return undefined;
}

export function firstGlobalEip155Account(
  session: Session,
  chainId: number,
  excluded?: Address
): Address | undefined {
  return projectEthAccountsForChain(session, chainId).find(
    (account) => !excluded || account.toLowerCase() !== excluded.toLowerCase()
  );
}

/** Replace accounts on one granted scope while preserving methods, capabilities, and session id. */
export function withEip155Accounts(
  session: Session,
  chainId: number,
  addresses: Address[]
): Session {
  const id = eip155Caip2(chainId);
  const scopeKey = session.scopes[id] ? id : 'eip155';
  const scope = session.scopes[scopeKey];
  if (!scope) return session;
  // Chain-keyed grants store CAIP-10 ids; a namespace grant stores raw addresses.
  const accounts =
    scopeKey === id
      ? addresses.map((address) => formatEip155Account(chainId, address))
      : [...addresses];
  return {
    ...session,
    scopes: {
      ...session.scopes,
      [scopeKey]: { ...scope, accounts },
    },
  };
}
