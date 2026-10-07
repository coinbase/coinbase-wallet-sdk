import type { Envelope, NamespaceTranslator } from ':core/session/types.js';
import { decodeSolanaResult } from './codec.js';
import { assertSolanaEnvelope, qualify } from './envelope.js';

/**
 * Solana policy for the invoke kernel.
 *
 * Unlike eip155, Solana results are not JSON-native — signatures and transactions come
 * back encoded — so this namespace supplies a decoder on top of the kernel's CAIP-27
 * unwrapping.
 */
function decodeResult(result: unknown, envelope: Envelope): unknown {
  assertSolanaEnvelope(envelope);
  return decodeSolanaResult(envelope.request.method, result);
}

export const solanaTranslator = {
  qualify,
  decodeResult,
} satisfies NamespaceTranslator;
