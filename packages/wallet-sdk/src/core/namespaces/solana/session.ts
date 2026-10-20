import type { Caip25RequestScope } from ':core/rpc/wallet_createSession.js';
import { activeGrantForNamespace } from ':core/session/grants.js';
import type { ScopeRequirement } from ':core/session/types.js';
import type { Session } from ':core/session/types.js';
import * as Base58 from 'ox/Base58';
import { SOLANA_MAINNET, SOLANA_NAMESPACE } from './caip.js';
import { SOLANA_METHODS, SOLANA_OPTIONAL_METHODS } from './methods.js';

/** Exact authorization needed by the internal Solana interface. */
export const SOLANA_MAINNET_REQUIRED_SCOPES = [
  {
    chainId: SOLANA_MAINNET,
    methods: SOLANA_METHODS.filter((method) => !SOLANA_OPTIONAL_METHODS.includes(method)),
  },
] as const satisfies readonly ScopeRequirement[];

/** True for a base58 encoding of exactly one 32-byte Solana public key. */
export function isSolanaPublicKey(value: string): boolean {
  if (value.length < 32 || value.length > 44) return false;
  try {
    let leadingZeroBytes = 0;
    while (value[leadingZeroBytes] === '1') leadingZeroBytes += 1;
    const integerHex = Base58.toHex(value).slice(2 + leadingZeroBytes * 2);
    const integerBytes = integerHex === '0' ? 0 : Math.ceil(integerHex.length / 2);
    return leadingZeroBytes + integerBytes === 32;
  } catch {
    return false;
  }
}

/**
 * Scope sent by Solana pairing.
 *
 * Keyed by the bare namespace, like eip155: the SDK supports exactly one Solana
 * cluster, and every Solana envelope is built for it.
 */
export function createSolanaMainnetScopes(): Record<string, Caip25RequestScope> {
  // Namespace-keyed with no chain list, the same shape `walletConnectToCaip25Scopes` sends: only
  // namespace-keyed scopes become grants, and `activeGrantForChain` resolves through them.
  return { [SOLANA_NAMESPACE]: { methods: [...SOLANA_METHODS], notifications: [] } };
}

/** Raw mainnet public keys in wallet-granted order, without duplicates. */
export function projectSolanaAccounts(session: Session): string[] {
  const seen = new Set<string>();
  const publicKeys: string[] = [];

  for (const publicKey of activeGrantForNamespace(session, SOLANA_NAMESPACE)?.accounts ?? []) {
    if (!isSolanaPublicKey(publicKey) || seen.has(publicKey)) continue;
    seen.add(publicKey);
    publicKeys.push(publicKey);
  }
  return publicKeys;
}
