import { standardErrors } from ':core/error/errors.js';
import type { SolanaInvokeRequest } from './types.js';
import { parseCaip10 } from ':core/session/caip.js';
import { solanaChainId } from './session.js';
import type { Envelope, Session } from ':core/session/types.js';
import { encodeSolanaRequest } from './codec.js';
import {
  SOLANA_MAINNET,
  SOLANA_MAINNET_REFERENCE,
  SOLANA_WALLET_STANDARD_MAINNET,
} from './caip.js';
import { SOLANA_WALLET_METHODS } from './methods.js';
import { extractPubkeys } from './pubkey.js';

export function assertSolanaEnvelope(envelope: Envelope): void {
  if (envelope.chainId !== SOLANA_MAINNET) {
    throw standardErrors.provider.unsupportedChain(
      `Solana translator does not support ${envelope.chainId}`
    );
  }
  if (!SOLANA_WALLET_METHODS.has(envelope.request.method)) {
    throw standardErrors.provider.unsupportedMethod(
      `Unsupported Solana method ${envelope.request.method}`
    );
  }
  extractPubkeys(envelope.request);
}

function scopeContains(session: Session, envelope: Envelope, publicKey: string): boolean {
  return (session.scopes[envelope.chainId]?.accounts ?? []).some((account) => {
    const parsed = parseCaip10(account);
    return (
      parsed?.namespace === 'solana' &&
      parsed.reference === SOLANA_MAINNET_REFERENCE &&
      parsed.account === publicKey
    );
  });
}

/** Wrap an internal Solana request as an exact-mainnet CAIP-27 envelope. */
export function toEnvelope(
  request: SolanaInvokeRequest,
  chain: string = SOLANA_WALLET_STANDARD_MAINNET
): Envelope {
  const encoded = encodeSolanaRequest(request);
  const envelope: Envelope = {
    chainId: solanaChainId(chain),
    request: encoded,
  };
  assertSolanaEnvelope(envelope);
  return envelope;
}

/** Require explicitly requested public keys on the exact authorized scope. */
export function qualify(session: Session, envelope: Envelope): Envelope {
  assertSolanaEnvelope(envelope);
  const publicKeys = extractPubkeys(envelope.request);
  if (publicKeys.length === 0) {
    throw standardErrors.provider.unauthorized('Solana signing request must identify an account');
  }
  for (const publicKey of publicKeys) {
    if (!scopeContains(session, envelope, publicKey)) {
      throw standardErrors.provider.unauthorized('pubkey is not in the Solana session scope');
    }
  }
  return envelope;
}
