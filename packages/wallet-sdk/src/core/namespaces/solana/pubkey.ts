import { standardErrors } from ':core/error/errors.js';
import { asRecord } from ':util/wire.js';
import { isSolanaPublicKey } from './session.js';

function requirePubkey(value: unknown, field: string): string {
  if (typeof value !== 'string' || !isSolanaPublicKey(value)) {
    throw standardErrors.rpc.invalidParams(`${field} must be a base58-encoded 32-byte public key`);
  }
  return value;
}

/**
 * Extract the signers a JSON-safe Solana request names.
 *
 * A batch names one `pubkey` per input; every other signing method names a single `pubkey`.
 */
export function extractPubkeys(request: {
  method: string;
  params?: readonly unknown[] | object;
}): string[] {
  const payload = asRecord(Array.isArray(request.params) ? request.params[0] : request.params);
  if (!payload) return [];

  if (request.method === 'solana_signAndSendAllTransactions') {
    const { inputs } = payload;
    if (!Array.isArray(inputs) || inputs.length === 0) {
      throw standardErrors.rpc.invalidParams(`${request.method}.inputs must not be empty`);
    }
    return inputs.map((input, index) =>
      requirePubkey(asRecord(input)?.pubkey, `${request.method}.inputs[${index}].pubkey`)
    );
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'pubkey')) return [];
  return [requirePubkey(payload.pubkey, `${request.method}.pubkey`)];
}
