import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { isAddress, isAddressEqual } from 'viem';
import { accountOf, namespaceOf } from ':core/session/caip.js';
import { accountsFor } from ':core/session/grants.js';
import type { Envelope, Session } from ':core/session/types.js';
import { extractFrom } from './from.js';
import { eip155Caip2 } from './caip.js';

function sameAccount(a: string, b: string): boolean {
  const addrA = accountOf(a);
  const addrB = accountOf(b);
  if (isAddress(addrA) && isAddress(addrB)) return isAddressEqual(addrA, addrB);
  return addrA.toLowerCase() === addrB.toLowerCase();
}

/**
 * Wrap an EIP-1193 request as a CAIP-27 envelope (`chainId` + `request`).
 *
 * The signer stays in `request.params`. `qualify` (called by `invoke`) checks it
 * against the session.
 */
export function toEnvelope(request: RequestArguments, chainId: number): Envelope {
  return {
    chainId: eip155Caip2(chainId),
    request: { method: request.method, params: request.params ?? [] },
  };
}

/**
 * Reject when the eip155 signer is not in this session.
 *
 * An explicit signer (`personal_sign` params[1], tx `from`, …) must be granted
 * on the target chain, by an exact chain grant or by the eip155 namespace grant.
 * Signer-less methods require at least one authorized account without selecting
 * one globally.
 */
export function qualify(session: Session, envelope: Envelope): Envelope {
  if (namespaceOf(envelope.chainId) !== 'eip155') {
    throw standardErrors.provider.unsupportedMethod(`eip155 qualify received ${envelope.chainId}`);
  }
  const accounts = accountsFor(session, envelope.chainId);
  if (accounts.length === 0) {
    throw standardErrors.provider.unauthorized('No eip155 account granted for target chain');
  }
  const extracted = extractFrom(envelope.request);
  if (extracted && !accounts.some((account) => sameAccount(account, extracted))) {
    throw standardErrors.provider.unauthorized('from is not granted on the target chain');
  }
  return envelope;
}
