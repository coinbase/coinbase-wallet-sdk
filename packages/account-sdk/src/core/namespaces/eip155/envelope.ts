import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { isAddress, isAddressEqual } from 'viem';
import { accountOf, eip155Caip2, namespaceOf } from '../../session/caip.js';
import type { Envelope, Session } from '../../session/types.js';
import { extractFrom } from './from.js';

function sameAccount(a: string, b: string): boolean {
  const addrA = accountOf(a);
  const addrB = accountOf(b);
  if (isAddress(addrA) && isAddress(addrB)) return isAddressEqual(addrA, addrB);
  return addrA.toLowerCase() === addrB.toLowerCase();
}

/** True when `account` (CAIP-10 or raw address) is in this session's eip155 scopes. */
function inSession(session: Session, account: string): boolean {
  return Object.entries(session.scopes).some(
    ([id, scope]) =>
      namespaceOf(id) === 'eip155' && scope.accounts.some((item) => sameAccount(item, account))
  );
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
 * Signer is `extractFrom(request.params)` when the dapp supplied one
 * (`personal_sign` params[1], tx `from`, …), otherwise `session.selected.eip155`.
 * Does not copy `from` onto the envelope.
 */
export function qualify(session: Session, envelope: Envelope): Envelope {
  if (namespaceOf(envelope.chainId) !== 'eip155') {
    throw standardErrors.provider.unsupportedMethod(`eip155 qualify received ${envelope.chainId}`);
  }
  const extracted = extractFrom(envelope.request);
  const from = extracted ?? session.selected.eip155;
  if (!from) throw standardErrors.provider.unauthorized('No eip155 account selected');
  if (!inSession(session, from)) {
    throw standardErrors.provider.unauthorized('from is not in the eip155 session');
  }
  return envelope;
}
