// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

/**
 * Shortcut 0: Generic JSON-RPC encoder/decoder
 * Universal fallback for any JSON-RPC method
 */

import type { GenericJsonRpc } from '../types.js';

/**
 * Encode a generic JSON-RPC request
 * @param method - JSON-RPC method name
 * @param params - Parameters (any JSON-serializable value)
 * @returns GenericJsonRpc message
 */
export function encodeGenericRpc(method: string, params: unknown): GenericJsonRpc {
  const paramsJson = JSON.stringify(params);
  const paramsBytes = new TextEncoder().encode(paramsJson);

  return {
    method,
    paramsJson: paramsBytes,
    rpcVersion: '2.0',
  };
}

/**
 * Decode a generic JSON-RPC request
 * @param payload - GenericJsonRpc message
 * @returns Decoded method and params
 */
export function decodeGenericRpc(payload: GenericJsonRpc): { method: string; params: unknown } {
  const paramsJson = new TextDecoder().decode(payload.paramsJson);

  let params: unknown;
  try {
    params = JSON.parse(paramsJson);
  } catch (error) {
    throw new Error(
      `Failed to parse params JSON: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }

  return {
    method: payload.method,
    params,
  };
}
