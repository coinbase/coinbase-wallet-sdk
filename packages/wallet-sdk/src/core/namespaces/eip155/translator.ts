import { parseCaip27Response, unwrapCaip27Response } from ':core/session/caip27.js';
import type { Envelope, NamespaceTranslator } from ':core/session/types.js';
import { qualify } from './envelope.js';

function unwrapResponse(response: unknown, envelope: Envelope): unknown {
  return unwrapCaip27Response(parseCaip27Response(response, envelope));
}

export const eip155Translator = {
  qualify,
  unwrapResponse,
} satisfies NamespaceTranslator;
