import { Address } from ':core/type/index.js';
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
 * Authorization is namespace-wide, so this is the account list on every EVM chain. This is
 * the one place eip155 account format is checked; every reader goes through it.
 */
export function projectEthAccounts(session: Session): Address[] {
  const seen = new Set<string>();
  const addresses: Address[] = [];

  for (const address of activeEip155Grant(session)?.accounts.filter((a) => isAddress(a)) ?? []) {
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push(address);
  }
  return addresses;
}

/**
 * The wallet's EVM chain catalog: which chains it can serve, and what it knows about them.
 *
 * This is capability, not authorization. A chain missing here is a 4902 (unsupported
 * chain) concern, never a 4100 (unauthorized) one. An entry with no metadata still
 * counts — the entry itself is the wallet saying it can serve that chain.
 */
export function projectEip155ChainMetadata(session: Session): SDKChain[] {
  const chains: SDKChain[] = [];
  for (const [caip2, { rpcUrl, nativeCurrency }] of Object.entries(session.chainMetadata ?? {})) {
    const id = parseEip155ChainId(caip2);
    if (id === null) continue;
    chains.push({
      id,
      ...(rpcUrl ? { rpcUrl } : {}),
      ...(nativeCurrency ? { nativeCurrency } : {}),
    });
  }
  return chains;
}

export function rpcUrlForEip155Chain(session: Session, chainId: number): string | undefined {
  return projectEip155ChainMetadata(session).find((chain) => chain.id === chainId)?.rpcUrl;
}

/** True when the wallet's chain catalog covers this chain. */
export function isKnownEip155Chain(session: Session, chainId: number): boolean {
  return projectEip155ChainMetadata(session).some((chain) => chain.id === chainId);
}

/**
 * EIP-5792 capabilities keyed by hex chain id.
 *
 * The grant is namespace-wide, so its capabilities are reported under the EIP-5792
 * all-chains key (`0x0`). Capabilities that differ per chain arrive in the wallet's
 * chain catalog and are reported under that chain.
 */
export function projectEip155Capabilities(session: Session): Record<string, unknown> {
  const capabilities: Record<string, unknown> = {};
  const namespaceCapabilities = activeEip155Grant(session)?.capabilities;
  if (namespaceCapabilities) capabilities['0x0'] = namespaceCapabilities;
  for (const [caip2, entry] of Object.entries(session.chainMetadata ?? {})) {
    const id = parseEip155ChainId(caip2);
    if (id !== null && entry.capabilities) capabilities[numberToHex(id)] = entry.capabilities;
  }
  return capabilities;
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
  const key = formatEip155ChainId(chainId);
  return {
    ...session,
    chainMetadata: { ...session.chainMetadata, [key]: session.chainMetadata?.[key] ?? {} },
  };
}
