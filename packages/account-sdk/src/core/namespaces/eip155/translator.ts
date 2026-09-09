import { parseCaip27Response, unwrapCaip27Response } from '../../session/caip27.js';
import type { Envelope } from '../../session/types.js';
import type { NamespaceTranslator } from '../../translators/types.js';
import { qualify } from './envelope.js';

function unwrapResponse(response: unknown, envelope: Envelope): unknown {
  return unwrapCaip27Response(parseCaip27Response(response, envelope));
}

export const eip155Translator = {
  namespace: 'eip155',
  qualify,
  unwrapResponse,
} satisfies NamespaceTranslator<'eip155'>;
