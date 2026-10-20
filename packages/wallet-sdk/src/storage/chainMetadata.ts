import { isRecord } from '../util/guards.js';
import type { ChainMetadata } from './schema.js';

/**
 * The wallet's chain catalog from the `wallet_createSession` result or a persisted session.
 *
 * Lenient on purpose: a malformed field is dropped and the entry kept, because an entry
 * with no metadata still says the wallet can serve that chain. An entry that is not an
 * object is dropped whole. Keys are kept as sent; each namespace parses the ones it reads.
 */
export function parseChainMetadata(value: unknown): Record<string, ChainMetadata> | undefined {
  if (!isRecord(value)) return undefined;
  const chains: Record<string, ChainMetadata> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const rpcUrl = parseRpcUrl(entry.rpcUrl);
    const nativeCurrency = parseNativeCurrency(entry.nativeCurrency);
    chains[key] = {
      ...(rpcUrl ? { rpcUrl } : {}),
      ...(nativeCurrency ? { nativeCurrency } : {}),
      ...(isRecord(entry.capabilities) ? { capabilities: entry.capabilities } : {}),
    };
  }
  return chains;
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

function parseNativeCurrency(value: unknown): ChainMetadata['nativeCurrency'] {
  if (!isRecord(value)) return undefined;
  const { name, symbol, decimal } = value;
  if (typeof name !== 'string' || typeof symbol !== 'string') return undefined;
  if (typeof decimal !== 'number' || !Number.isInteger(decimal) || decimal < 0) return undefined;
  return { name, symbol, decimal };
}
