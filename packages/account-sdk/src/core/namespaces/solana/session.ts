import { standardErrors } from ':core/error/errors.js';
import * as Base58 from 'ox/Base58';
import { type Caip2, type Caip10, formatCaip10, parseCaip10 } from ':core/session/caip.js';
import type { Caip25RequestScope } from ':core/session/caip25.js';
import type { ScopeRequirement } from ':core/session/covers.js';
import type { Session } from ':core/session/types.js';
import {
  SOLANA_MAINNET,
  SOLANA_MAINNET_REFERENCE,
  SOLANA_WALLET_STANDARD_MAINNET,
} from './caip.js';

/** CAIP-27 methods requested for the initial Solana mainnet session. */
export const SOLANA_METHODS = [
  'solana_signMessage',
  'solana_signTransaction',
  'solana_signAndSendTransaction',
  'solana_signAndSendAllTransactions',
] as const;

/** Exact authorization needed by the internal Solana interface. */
export const SOLANA_MAINNET_REQUIRED_SCOPES = [
  { chainId: SOLANA_MAINNET, methods: SOLANA_METHODS },
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

/** Map the supported Wallet Standard or CAIP chain name to exact CAIP-2. */
export function solanaChainId(chain: string): typeof SOLANA_MAINNET {
  if (chain === SOLANA_WALLET_STANDARD_MAINNET || chain === SOLANA_MAINNET) {
    return SOLANA_MAINNET;
  }
  throw standardErrors.provider.unsupportedChain(`Unsupported Solana chain ${chain}`);
}

/** Map the exact supported CAIP-2 id back to its Wallet Standard cluster name. */
export function solanaWalletStandardChain(chainId: Caip2): typeof SOLANA_WALLET_STANDARD_MAINNET {
  if (chainId === SOLANA_MAINNET) return SOLANA_WALLET_STANDARD_MAINNET;
  throw standardErrors.provider.unsupportedChain(`Unsupported Solana chain ${chainId}`);
}

/** Format and validate a Solana mainnet CAIP-10 account. */
export function formatSolanaAccount(publicKey: string): Caip10 {
  if (!isSolanaPublicKey(publicKey)) {
    throw standardErrors.rpc.invalidParams(
      'Solana account must be a base58-encoded 32-byte public key'
    );
  }
  return formatCaip10(SOLANA_MAINNET, publicKey);
}

/** Namespace scope sent by Solana pairing. No EVM wallet_connect extensions. */
export function createSolanaMainnetScopes(
  methods: readonly string[] = SOLANA_METHODS
): Record<'solana', Caip25RequestScope> {
  return {
    solana: {
      chains: [SOLANA_MAINNET_REFERENCE],
      methods: [...new Set(methods)],
      notifications: [],
    },
  };
}

/** Build a Solana-only session for tests and restored interface state. */
export function sessionFromSolanaAccounts(opts: {
  accounts: string[];
}): Session {
  const accounts = opts.accounts.map(formatSolanaAccount);
  return {
    scopes: {
      [SOLANA_MAINNET]: { accounts, methods: [...SOLANA_METHODS] },
    },
  };
}

/** Raw mainnet public keys in wallet-granted order, without duplicates. */
export function projectSolanaAccounts(session: Session): string[] {
  const seen = new Set<string>();
  const publicKeys: string[] = [];

  const push = (account: Caip10) => {
    const parsed = parseCaip10(account);
    if (
      !parsed ||
      parsed.namespace !== 'solana' ||
      parsed.reference !== SOLANA_MAINNET_REFERENCE ||
      !isSolanaPublicKey(parsed.account) ||
      seen.has(parsed.account)
    ) {
      return;
    }
    seen.add(parsed.account);
    publicKeys.push(parsed.account);
  };

  for (const [chainId, scope] of Object.entries(session.scopes)) {
    if (chainId !== SOLANA_MAINNET) continue;
    for (const account of scope.accounts) push(account);
  }
  return publicKeys;
}
