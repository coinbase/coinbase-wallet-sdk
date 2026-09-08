import { standardErrors } from ':core/error/errors.js';
import { isSolanaPublicKey } from './session.js';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requirePubkey(value: unknown, field: string): string {
  if (typeof value !== 'string' || !isSolanaPublicKey(value)) {
    throw standardErrors.rpc.invalidParams(`${field} must be a base58-encoded 32-byte public key`);
  }
  return value;
}

/**
 * Extract every explicit signer carried by a JSON-safe Solana request.
 */
export function extractPubkeys(request: {
  method: string;
  params?: readonly unknown[] | object;
}): string[] {
  const params = Array.isArray(request.params) ? request.params[0] : request.params;
  const payload = asRecord(params);
  if (!payload) return [];

  if (Object.prototype.hasOwnProperty.call(payload, 'pubkey')) {
    return [requirePubkey(payload.pubkey, `${request.method}.pubkey`)];
  }

  if (request.method !== 'solana_signAndSendAllTransactions') return [];
  if (!Array.isArray(payload.inputs) || payload.inputs.length === 0) {
    throw standardErrors.rpc.invalidParams(`${request.method}.inputs must not be empty`);
  }
  return payload.inputs.map((input, index) => {
    const record = asRecord(input);
    return requirePubkey(record?.pubkey, `${request.method}.inputs[${index}].pubkey`);
  });
}
