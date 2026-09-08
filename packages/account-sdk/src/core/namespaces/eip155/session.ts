import { Address } from ':core/type/index.js';
import { type Caip2, type Caip10, accountOf, chainIdOf, namespaceOf } from ':core/session/caip.js';
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

/** eip155 addresses only. Solana / bip122 never appear here. */
export function projectEthAccounts(session: Session): Address[] {
  const seen = new Set<string>();
  const addresses: Address[] = [];

  const push = (account: Caip10) => {
    if (namespaceOf(account) !== 'eip155') return;
    if (eip155ChainId(chainIdOf(account)) === null) return;
    const address = accountOf(account);
    if (!isAddress(address)) return;
    const key = address.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    addresses.push(address as Address);
  };

  for (const [id, scope] of Object.entries(session.scopes)) {
    if (namespaceOf(id) !== 'eip155') continue;
    for (const account of scope.accounts) push(account);
  }
  return addresses;
}

/** EIP-155 addresses granted on one exact chain, preserving wallet order. */
export function projectEthAccountsForChain(session: Session, chainId: number): Address[] {
  const accounts = session.scopes[eip155Caip2(chainId)]?.accounts ?? [];
  return accounts.flatMap((account) => {
    const address = accountOf(account);
    return isAddress(address) ? [address as Address] : [];
  });
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
    session.scopes[eip155Caip2(chainId)] !== undefined ||
    projectEip155ChainMetadata(session).some((chain) => chain.id === chainId)
  );
}

/** EIP-5792 capabilities keyed by hex chain id. */
export function projectEip155Capabilities(session: Session): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(session.scopes).flatMap(([caip2, scope]) => {
      const chainId = eip155ChainId(caip2 as `eip155:${string}`);
      return chainId === null || !scope.capabilities
        ? []
        : [[numberToHex(chainId), scope.capabilities]];
    })
  );
}

/** First granted EIP-155 chain in wallet response order. */
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
  const scope = session.scopes[id];
  if (!scope) return session;
  const accounts = addresses.map((address) => formatEip155Account(chainId, address));
  return {
    ...session,
    scopes: {
      ...session.scopes,
      [id]: { ...scope, accounts },
    },
  };
}
