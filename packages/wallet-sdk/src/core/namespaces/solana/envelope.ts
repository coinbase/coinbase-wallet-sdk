import { standardErrors } from ':core/error/errors.js';
import { activeGrantForChain } from ':core/session/grants.js';
import type { Envelope, Session } from ':core/session/types.js';
import { SOLANA_MAINNET } from './caip.js';
import { encodeSolanaRequest } from './codec.js';
import { SOLANA_OPTIONAL_METHODS } from './methods.js';
import { extractPubkeys } from './pubkey.js';
import type { SolanaInvokeRequest } from './types.js';

/**
 * Wrap a typed Solana request as a mainnet CAIP-27 envelope.
 *
 * Mainnet is the only cluster the SDK serves; the Wallet Standard wallet rejects every
 * other chain before a request is built.
 */
export function toEnvelope(request: SolanaInvokeRequest): Envelope {
  return { chainId: SOLANA_MAINNET, request: encodeSolanaRequest(request) };
}

/** Require explicitly requested public keys on the exact authorized scope. */
export function qualify(session: Session, envelope: Envelope): Envelope {
  const { method } = envelope.request;
  const grant = activeGrantForChain(session, envelope.chainId);
  if (SOLANA_OPTIONAL_METHODS.includes(method) && !grant?.methods.includes(method)) {
    throw standardErrors.provider.unauthorized(`${method} is not granted to this session`);
  }
  const publicKeys = extractPubkeys(envelope.request);
  if (publicKeys.length === 0) {
    throw standardErrors.provider.unauthorized('Solana signing request must identify an account');
  }
  for (const publicKey of publicKeys) {
    if (!grant?.accounts.includes(publicKey)) {
      throw standardErrors.provider.unauthorized('pubkey is not in the Solana session scope');
    }
  }
  return envelope;
}
