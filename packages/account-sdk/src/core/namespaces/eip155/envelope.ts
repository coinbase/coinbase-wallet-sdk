import { standardErrors } from ':core/error/errors.js';
import { RequestArguments } from ':core/provider/interface.js';
import { isAddress, isAddressEqual } from 'viem';
import {
  type Caip10,
  accountOf,
  eip155Caip2,
  formatEip155Account,
  isCaip10,
  namespaceOf,
} from '../../session/caip.js';
import type { Envelope, Session } from '../../session/index.js';
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
 * Wrap an EIP-1193 request as an internal envelope.
 *
 * `from` is the dapp-supplied signing address when present (`personal_sign` params[1],
 * tx `from`, …). Otherwise the session's selected eip155 account. `params` are copied
 * through unchanged, so `wallet_connect` capabilities stay on the envelope.
 */
export function toEnvelope(session: Session, request: RequestArguments, chainId: number): Envelope {
  const extracted = extractFrom(request);
  const from: Caip10 | undefined = extracted
    ? isCaip10(extracted)
      ? extracted
      : formatEip155Account(chainId, extracted)
    : session.selected.eip155;

  return {
    chainId: eip155Caip2(chainId),
    method: request.method,
    params: request.params,
    from,
  };
}

/**
 * Fill `from` if missing and reject the call when that account is not in this eip155 session.
 * Called by `invoke` before the popup sees the request.
 */
export function qualify(session: Session, envelope: Envelope): Envelope {
  if (namespaceOf(envelope.chainId) !== 'eip155') {
    throw standardErrors.provider.unsupportedMethod(`eip155 qualify received ${envelope.chainId}`);
  }
  const from = envelope.from ?? session.selected.eip155;
  if (!from) throw standardErrors.provider.unauthorized('No eip155 account selected');
  if (!inSession(session, from)) {
    throw standardErrors.provider.unauthorized('from is not in the eip155 session');
  }
  return { ...envelope, from };
}

/** Strip CAIP `chainId`/`from`. The v1 popup decrypts `{ action: { method, params }, chainId: number }`. */
export function toLegacyRequest(envelope: Envelope): RequestArguments {
  return { method: envelope.method, params: envelope.params };
}
