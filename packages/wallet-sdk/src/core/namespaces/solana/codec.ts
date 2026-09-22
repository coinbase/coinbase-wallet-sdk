import { standardErrors } from ':core/error/errors.js';
import { asRecord } from ':util/wire.js';
import type { SolanaInvokeRequest, SolanaInvokeResult } from './types.js';

function bytesToBase64(bytes: unknown, field: string): string {
  if (Object.prototype.toString.call(bytes) !== '[object Uint8Array]') {
    throw standardErrors.rpc.invalidParams(`${field} must be a Uint8Array`);
  }
  let binary = '';
  for (const byte of Uint8Array.from(bytes as ArrayLike<number>)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: unknown, field: string): Uint8Array {
  if (typeof value !== 'string' || value.length === 0) {
    throw standardErrors.rpc.internal(`${field} must be a base64 string`);
  }
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw standardErrors.rpc.internal(`${field} must be valid base64`);
  }
}

function resultRecord(value: unknown, method: string): Record<string, unknown> {
  const record = asRecord(value);
  if (!record) throw standardErrors.rpc.internal(`${method} did not return an object`);
  return record;
}

function encodedTransaction(
  input: {
    pubkey: string;
    transaction: Uint8Array;
    options?: object;
  },
  field: string
) {
  return {
    pubkey: input.pubkey,
    transaction: bytesToBase64(input.transaction, `${field}.transaction`),
    ...(input.options ? { options: input.options } : {}),
  };
}

function decodeSignature(value: unknown, field: string): Uint8Array {
  const signature = base64ToBytes(value, field);
  if (signature.length !== 64) {
    throw standardErrors.rpc.internal(`${field} must contain 64 bytes`);
  }
  return signature;
}

/** Convert byte-oriented Solana requests into JSON-safe CAIP method params. */
export function encodeSolanaRequest(request: SolanaInvokeRequest) {
  switch (request.method) {
    case 'solana_signMessage':
      return {
        method: request.method,
        params: {
          pubkey: request.params.pubkey,
          message: bytesToBase64(request.params.message, `${request.method}.message`),
        },
      };
    case 'solana_signTransaction':
      return {
        method: request.method,
        params: encodedTransaction(request.params, request.method),
      };
    case 'solana_signAndSendTransaction':
      return {
        method: request.method,
        params: encodedTransaction(request.params, request.method),
      };
    case 'solana_signAndSendAllTransactions':
      return {
        method: request.method,
        params: {
          inputs: request.params.inputs.map((input, index) =>
            encodedTransaction(input, `${request.method}.inputs[${index}]`)
          ),
          ...(request.params.options ? { options: request.params.options } : {}),
        },
      };
    default:
      throw standardErrors.provider.unsupportedMethod(
        `Unsupported Solana method ${(request as { method?: unknown }).method}`
      );
  }
}

/** Decode and validate JSON-safe CAIP method results at the namespace boundary. */
export function decodeSolanaResult(method: string, value: unknown): SolanaInvokeResult {
  switch (method) {
    case 'solana_signMessage': {
      const result = resultRecord(value, method);
      const signature = decodeSignature(result.signature, `${method}.signature`);
      return {
        signature,
        ...(result.signedMessage === undefined
          ? {}
          : { signedMessage: base64ToBytes(result.signedMessage, `${method}.signedMessage`) }),
      };
    }
    case 'solana_signTransaction': {
      const result = resultRecord(value, method);
      const signedTransaction = base64ToBytes(
        result.signedTransaction,
        `${method}.signedTransaction`
      );
      if (signedTransaction.length === 0) {
        throw standardErrors.rpc.internal(`${method}.signedTransaction must not be empty`);
      }
      return { signedTransaction };
    }
    case 'solana_signAndSendTransaction': {
      const result = resultRecord(value, method);
      return { signature: decodeSignature(result.signature, `${method}.signature`) };
    }
    case 'solana_signAndSendAllTransactions': {
      if (!Array.isArray(value)) {
        throw standardErrors.rpc.internal(`${method} did not return an array`);
      }
      return value.map((item, index) => {
        const settled = resultRecord(item, `${method}[${index}]`);
        if (settled.status === 'fulfilled') {
          const result = resultRecord(settled.value, `${method}[${index}].value`);
          return {
            status: 'fulfilled' as const,
            value: {
              signature: decodeSignature(result.signature, `${method}[${index}].value.signature`),
            },
          };
        }
        if (settled.status === 'rejected') {
          return { status: 'rejected' as const, reason: settled.reason };
        }
        throw standardErrors.rpc.internal(
          `${method}[${index}].status must be fulfilled or rejected`
        );
      });
    }
    default:
      throw standardErrors.provider.unsupportedMethod(`Unsupported Solana method ${method}`);
  }
}
