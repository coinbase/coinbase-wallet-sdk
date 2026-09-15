import { parseCaip27Response, unwrapCaip27Response } from ':core/session/caip27.js';
import type { Envelope, NamespaceTranslator } from ':core/session/types.js';
import { decodeSolanaResult } from './codec.js';
import { assertSolanaEnvelope, qualify } from './envelope.js';

function unwrapResponse(response: unknown, envelope: Envelope): unknown {
  assertSolanaEnvelope(envelope);
  return decodeSolanaResult(
    envelope.request.method,
    unwrapCaip27Response(parseCaip27Response(response, envelope))
  );
}

export const solanaTranslator = {
  qualify,
  unwrapResponse,
} satisfies NamespaceTranslator;
