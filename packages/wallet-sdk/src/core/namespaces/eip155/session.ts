import { Address } from ':core/type/index.js';
import { isRecord } from ':util/wire.js';
import { activeGrantForNamespace } from ':core/session/grants.js';
import type { Session } from ':core/session/types.js';
import type { SDKChain } from './client/index.js';
import { isAddress, numberToHex } from 'viem';
import { EIP155_NAMESPACE, formatEip155ChainId, parseEip155ChainId } from './caip.js';

/** The eip155 grant, or `undefined` when nothing is authorized. */
export function activeEip155Grant(session: Session) {
  return activeGrantForNamespace(session, EIP155_NAMESPACE);
}

/**
 * Every eip155 address in the session, in wallet order.
 *
 * Authorization is namespace-wide, so this is the account list on every EVM chain.
 */
export function projectEthAccounts(session: Session): Address[] {
  const seen = new Set<string>();
  const addresses: Address[] = [];

  for (const address of activeEip155Grant(session)?.accounts ?? []) {
    if (!isAddress(address)) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push(address as Address);
  }
  return addresses;
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

/** Raw chain catalog entries, keyed by CAIP-2, as the wallet returned them. */
function chainCatalog(session: Session): [chainId: number, entry: Record<string, unknown>][] {
  const metadata = session.properties?.chainMetadata;
  if (!isRecord(metadata)) return [];

  return Object.entries(metadata).flatMap(([caip2, value]) => {
    const id = parseEip155ChainId(caip2 as `eip155:${string}`);
    return id === null || !isRecord(value)
      ? []
      : [[id, value] as [number, Record<string, unknown>]];
  });
}

/**
 * The wallet's EVM chain catalog: which chains it can serve, and what it knows about them.
 *
 * This is capability, not authorization. A chain missing here is a 4902 (unsupported
 * chain) concern, never a 4100 (unauthorized) one. An entry with no metadata still
 * counts — the entry itself is the wallet saying it can serve that chain.
 */
export function projectEip155ChainMetadata(session: Session): SDKChain[] {
  return chainCatalog(session).map(([id, entry]) => {
    const rpcUrl = parseRpcUrl(entry.rpcUrl);
    const nativeCurrency = parseNativeCurrency(entry.nativeCurrency);
    return { id, ...(rpcUrl ? { rpcUrl } : {}), ...(nativeCurrency ? { nativeCurrency } : {}) };
  });
}

export function rpcUrlForEip155Chain(session: Session, chainId: number): string | undefined {
  return projectEip155ChainMetadata(session).find((chain) => chain.id === chainId)?.rpcUrl;
}

/** True when the wallet's chain catalog covers this chain. */
export function isKnownEip155Chain(session: Session, chainId: number): boolean {
  return chainCatalog(session).some(([id]) => id === chainId);
}

/**
 * EIP-5792 capabilities keyed by hex chain id.
 *
 * The grant is namespace-wide, so its capabilities are reported under the EIP-5792
 * all-chains key (`0x0`). Capabilities that differ per chain arrive in the wallet's
 * chain catalog and are reported under that chain.
 */
export function projectEip155Capabilities(session: Session): Record<string, unknown> {
  const namespaceCapabilities = activeEip155Grant(session)?.capabilities;
  const perChain = chainCatalog(session).flatMap(([id, entry]) =>
    isRecord(entry.capabilities) ? [[numberToHex(id), entry.capabilities] as const] : []
  );

  return Object.fromEntries([
    ...(namespaceCapabilities ? [['0x0', namespaceCapabilities] as const] : []),
    ...perChain,
  ]);
}

/** Replace the authorized accounts, preserving methods, capabilities, and session id. */
export function withEip155Accounts(session: Session, addresses: Address[]): Session {
  const grant = session.namespaces[EIP155_NAMESPACE];
  if (!grant) return session;
  return {
    ...session,
    namespaces: {
      ...session.namespaces,
      [EIP155_NAMESPACE]: { ...grant, accounts: [...addresses] },
    },
  };
}

/**
 * Add a chain to the wallet's catalog after the wallet accepted it.
 *
 * Catalog growth is capability discovery, not a new grant: `namespaces` is untouched.
 */
export function withKnownEip155Chain(session: Session, chainId: number): Session {
  const metadata = session.properties?.chainMetadata;
  const catalog: Record<string, unknown> = isRecord(metadata) ? metadata : {};
  const key = formatEip155ChainId(chainId);
  return {
    ...session,
    properties: {
      ...session.properties,
      chainMetadata: {
        ...catalog,
        [key]: isRecord(catalog[key]) ? catalog[key] : {},
      },
    },
  };
}
