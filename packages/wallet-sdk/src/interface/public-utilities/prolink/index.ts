// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

/**
 * Prolink URI encoding/decoding
 * Implements the Compressed RPC Link Format ERC specification
 */

import { decodeGenericRpc, encodeGenericRpc } from './shortcuts/generic.js';
import { decodeWalletSendCalls, encodeWalletSendCalls } from './shortcuts/sendCalls.js';
import { decodeWalletSign, encodeWalletSign } from './shortcuts/sign.js';
import type { ProlinkDecoded, ProlinkRequest, RpcLinkPayload } from './types.js';
import { decodeBase64url, encodeBase64url } from './utils/base64url.js';
import { compressPayload, decompressPayload } from './utils/compression.js';
import { decodeCapabilities, encodeCapabilities } from './utils/encoding.js';
import { decodeRpcLinkPayload, encodeRpcLinkPayload } from './utils/protobuf.js';

const PROTOCOL_VERSION = 1;
const SHORTCUT_VERSION = 0;

const SHORTCUT_GENERIC = 0;
const SHORTCUT_WALLET_SEND_CALLS = 1;
const SHORTCUT_WALLET_SIGN = 2;

/**
 * Encode a JSON-RPC request to prolink format
 * @param request - JSON-RPC request with method, params, optional chainId and capabilities
 * @returns Base64url-encoded prolink payload
 */
export async function encodeProlink(request: ProlinkRequest): Promise<string> {
  let payload: RpcLinkPayload;

  // Auto-detect shortcut based on method
  if (request.method === 'wallet_sendCalls') {
    // Validate params structure
    if (!Array.isArray(request.params) || request.params.length === 0) {
      throw new Error('wallet_sendCalls requires params array with at least one element');
    }

    const params = request.params[0];
    if (typeof params !== 'object' || !params) {
      throw new Error('wallet_sendCalls params[0] must be an object');
    }

    // Extract chainId from params
    const chainIdHex = (params as { chainId?: string }).chainId;
    if (!chainIdHex) {
      throw new Error('wallet_sendCalls requires chainId in params');
    }
    const chainId = Number.parseInt(chainIdHex, 16);

    const walletSendCalls = encodeWalletSendCalls(
      params as Parameters<typeof encodeWalletSendCalls>[0]
    );

    payload = {
      protocolVersion: PROTOCOL_VERSION,
      chainId,
      shortcutId: SHORTCUT_WALLET_SEND_CALLS,
      shortcutVersion: SHORTCUT_VERSION,
      body: {
        case: 'walletSendCalls',
        value: walletSendCalls,
      },
      capabilities: request.capabilities ? encodeCapabilities(request.capabilities) : undefined,
    };
  } else if (request.method === 'wallet_sign') {
    // Validate params structure
    if (!Array.isArray(request.params) || request.params.length === 0) {
      throw new Error('wallet_sign requires params array with at least one element');
    }

    const params = request.params[0];
    if (typeof params !== 'object' || !params) {
      throw new Error('wallet_sign params[0] must be an object');
    }

    // Extract chainId from params
    const chainIdHex = (params as { chainId?: string }).chainId;
    if (!chainIdHex) {
      throw new Error('wallet_sign requires chainId in params');
    }
    const chainId = Number.parseInt(chainIdHex, 16);

    const walletSign = encodeWalletSign(params as Parameters<typeof encodeWalletSign>[0]);

    payload = {
      protocolVersion: PROTOCOL_VERSION,
      chainId,
      shortcutId: SHORTCUT_WALLET_SIGN,
      shortcutVersion: SHORTCUT_VERSION,
      body: {
        case: 'walletSign',
        value: walletSign,
      },
      capabilities: request.capabilities ? encodeCapabilities(request.capabilities) : undefined,
    };
  } else {
    // Generic JSON-RPC
    const generic = encodeGenericRpc(request.method, request.params);

    payload = {
      protocolVersion: PROTOCOL_VERSION,
      chainId: request.chainId,
      shortcutId: SHORTCUT_GENERIC,
      shortcutVersion: SHORTCUT_VERSION,
      body: {
        case: 'generic',
        value: generic,
      },
      capabilities: request.capabilities ? encodeCapabilities(request.capabilities) : undefined,
    };
  }

  // Serialize to protobuf
  const protoBytes = encodeRpcLinkPayload(payload);

  // Compress (with flag byte)
  const { compressed, flag } = await compressPayload(protoBytes);
  const withFlag = new Uint8Array(compressed.length + 1);
  withFlag[0] = flag;
  withFlag.set(compressed, 1);

  // Base64url encode
  return encodeBase64url(withFlag);
}

/**
 * Decode a prolink payload to JSON-RPC request
 * @param payload - Base64url-encoded prolink payload
 * @returns Decoded JSON-RPC request
 */
export async function decodeProlink(payload: string): Promise<ProlinkDecoded> {
  // Base64url decode
  const bytes = decodeBase64url(payload);

  // Decompress
  const decompressed = await decompressPayload(bytes);

  // Deserialize protobuf
  const rpcPayload = decodeRpcLinkPayload(decompressed);

  // Validate protocol version
  if (rpcPayload.protocolVersion !== PROTOCOL_VERSION) {
    throw new Error(
      `Unsupported protocol version: ${rpcPayload.protocolVersion} (expected ${PROTOCOL_VERSION})`
    );
  }

  // Decode capabilities
  const capabilities = rpcPayload.capabilities
    ? decodeCapabilities(rpcPayload.capabilities)
    : undefined;

  // Dispatch to shortcut decoder
  if (rpcPayload.shortcutId === SHORTCUT_GENERIC) {
    if (rpcPayload.body.case !== 'generic') {
      throw new Error('Invalid payload: shortcut 0 requires generic body');
    }

    const { method, params } = decodeGenericRpc(rpcPayload.body.value);

    return {
      method,
      params,
      chainId: rpcPayload.chainId,
      capabilities,
    };
  }

  if (rpcPayload.shortcutId === SHORTCUT_WALLET_SEND_CALLS) {
    if (rpcPayload.body.case !== 'walletSendCalls') {
      throw new Error('Invalid payload: shortcut 1 requires walletSendCalls body');
    }

    if (!rpcPayload.chainId) {
      throw new Error('wallet_sendCalls requires chainId');
    }

    const params = decodeWalletSendCalls(rpcPayload.body.value, rpcPayload.chainId, capabilities);

    return {
      method: 'wallet_sendCalls',
      params: [params],
    };
  }

  if (rpcPayload.shortcutId === SHORTCUT_WALLET_SIGN) {
    if (rpcPayload.body.case !== 'walletSign') {
      throw new Error('Invalid payload: shortcut 2 requires walletSign body');
    }

    if (!rpcPayload.chainId) {
      throw new Error('wallet_sign requires chainId');
    }

    const params = decodeWalletSign(rpcPayload.body.value, rpcPayload.chainId, capabilities);

    return {
      method: 'wallet_sign',
      params: [params],
    };
  }

  throw new Error(`Unsupported shortcut ID: ${rpcPayload.shortcutId}`);
}

// Re-export universal link utilities
export { createProlinkUrl } from './createProlinkUrl.js';

// Re-export types
export type { ProlinkDecoded, ProlinkRequest } from './types.js';
