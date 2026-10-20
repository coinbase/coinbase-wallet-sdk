import { standardErrors } from ':core/error/errors.js';
import { asRecord } from ':util/guards.js';

function requirePubkey(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw standardErrors.rpc.invalidParams(`${label} must be a string`);
  }
  return value;
}

/**
 * Extract the signers a JSON-safe Solana request names.
 *
 * A batch names one `pubkey` per input; every other signing method names a single `pubkey`.
 * Key format is not checked here: `qualify` requires each signer to be one of the session's
 * projected accounts, which are all valid keys.
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
