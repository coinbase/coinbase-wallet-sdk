import { standardErrors } from ':core/error/errors.js';
import type { Namespace } from '../session/caip.js';
import { eip155Translator } from './eip155/index.js';
import type { NamespaceTranslator, SupportedNamespace } from './types.js';

// SupportedNamespace reserves recognized family slots; only entries here are
// implemented and enabled. Solana and bip122 intentionally remain unregistered.
const translators: Readonly<Partial<Record<SupportedNamespace, NamespaceTranslator>>> = {
  eip155: eip155Translator,
};

function asSupportedNamespace(namespace: Namespace): SupportedNamespace | undefined {
  switch (namespace) {
    case 'eip155':
    case 'solana':
    case 'bip122':
      return namespace;
    default:
      return undefined;
  }
}

export function getNamespaceTranslator(namespace: Namespace): NamespaceTranslator {
  const supported = asSupportedNamespace(namespace);
  const translator = supported ? translators[supported] : undefined;
  if (!translator) {
    throw standardErrors.provider.unsupportedMethod(
      `Namespace '${namespace}' is not enabled in this SDK version`
    );
  }
  return translator;
}
