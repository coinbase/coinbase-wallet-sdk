import { isRecord } from ':util/guards.js';

/** Anything can be thrown, so a value without a string `message` logs as an empty one. */
export const parseErrorMessageFromAny = (error: unknown): string => {
  return isRecord(error) && typeof error.message === 'string' ? error.message : '';
};

/** The EIP-1193 or JSON-RPC code, such as 4001 for a rejection or 4100 for a lost pairing. */
export const parseErrorCodeFromAny = (error: unknown): number | undefined => {
  return isRecord(error) && typeof error.code === 'number' ? error.code : undefined;
};
