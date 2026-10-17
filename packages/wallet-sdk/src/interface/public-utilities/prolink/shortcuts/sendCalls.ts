// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

/**
 * Shortcut 1: wallet_sendCalls encoder/decoder
 * Optimizes EIP-5792 wallet_sendCalls requests
 */

import type { WalletSendCalls } from '../types.js';
import { SendCallsType } from '../types.js';
import {
  bytesToHex,
  decodeAddress,
  encodeAddress,
  encodeAmount,
  hexToBytes,
  pad32,
} from '../utils/encoding.js';

// ERC20 transfer(address,uint256) selector
const ERC20_TRANSFER_SELECTOR = '0xa9059cbb';

type SendCallsParams = {
  version?: string;
  chainId: string;
  from?: string;
  calls: Array<{
    to: string;
    data?: string;
    value?: string;
  }>;
  capabilities?: Record<string, unknown>;
};

/**
 * Detect if calls represent an ERC20 transfer
 * Must be exactly one call with transfer selector, 68-byte data, and zero value
 */
function detectErc20Transfer(
  calls: SendCallsParams['calls']
): { token: string; recipient: string; amount: bigint } | null {
  if (calls.length !== 1) return null;

  const call = calls[0];
  const data = call.data || '0x';
  const value = call.value || '0x0';

  // Check for zero value
  const valueAmount = BigInt(value);
  if (valueAmount !== 0n) return null;

  // Check selector and length (4 bytes selector + 32 bytes recipient + 32 bytes amount = 68 bytes = 136 hex chars)
  if (!data.toLowerCase().startsWith(ERC20_TRANSFER_SELECTOR.toLowerCase())) return null;

  // Remove 0x prefix for length check
  const dataNoPrefix = data.slice(2);
  if (dataNoPrefix.length !== 136) return null; // 68 bytes = 136 hex chars

  // Extract recipient (bytes 4-35, i.e., chars 8-71)
  const recipientPadded = dataNoPrefix.slice(8, 72);
  const recipient = `0x${recipientPadded.slice(24)}`; // Last 20 bytes (40 chars)

  // Extract amount (bytes 36-67, i.e., chars 72-135)
  const amountHex = dataNoPrefix.slice(72, 136);
  const amount = BigInt(`0x${amountHex}`);

  return {
    token: call.to,
    recipient,
    amount,
  };
}

/**
 * Detect if calls represent a native transfer
 * Must be exactly one call with empty data and non-zero value
 */
function detectNativeTransfer(
  calls: SendCallsParams['calls']
): { recipient: string; amount: bigint } | null {
  if (calls.length !== 1) return null;

  const call = calls[0];
  const data = call.data || '0x';
  const value = call.value || '0x0';

  // Check for empty data
  if (data !== '0x' && data !== '') return null;

  // Check for non-zero value
  const amount = BigInt(value);
  if (amount === 0n) return null;

  return {
    recipient: call.to,
    amount,
  };
}

/**
 * Encode wallet_sendCalls request
 * @param params - EIP-5792 wallet_sendCalls parameters
 * @returns WalletSendCalls message
 */
export function encodeWalletSendCalls(params: SendCallsParams): WalletSendCalls {
  // Detect transaction type (order matters per spec)
  const erc20 = detectErc20Transfer(params.calls);
  if (erc20) {
    return {
      type: SendCallsType.ERC20_TRANSFER,
      transactionData: {
        case: 'erc20Transfer',
        value: {
          token: encodeAddress(erc20.token),
          recipient: encodeAddress(erc20.recipient),
          amount: encodeAmount(erc20.amount),
        },
      },
      from: params.from ? encodeAddress(params.from) : undefined,
      version: params.version || '1.0',
    };
  }

  const native = detectNativeTransfer(params.calls);
  if (native) {
    return {
      type: SendCallsType.NATIVE_TRANSFER,
      transactionData: {
        case: 'nativeTransfer',
        value: {
          recipient: encodeAddress(native.recipient),
          amount: encodeAmount(native.amount),
        },
      },
      from: params.from ? encodeAddress(params.from) : undefined,
      version: params.version || '1.0',
    };
  }

  // Generic calls
  return {
    type: SendCallsType.GENERIC_CALLS,
    transactionData: {
      case: 'genericCalls',
      value: {
        calls: params.calls.map((call) => ({
          to: encodeAddress(call.to),
          data: call.data ? hexToBytes(call.data) : new Uint8Array(),
          value: encodeAmount(call.value || '0x0'),
        })),
      },
    },
    from: params.from ? encodeAddress(params.from) : undefined,
    version: params.version || '1.0',
  };
}

/**
 * Decode wallet_sendCalls request
 * @param payload - WalletSendCalls message
 * @param chainId - Chain ID from top-level payload
 * @param capabilities - Optional capabilities from top-level payload
 * @returns EIP-5792 wallet_sendCalls parameters (ERC-8050 compliant with capabilities inside)
 */
export function decodeWalletSendCalls(
  payload: WalletSendCalls,
  chainId: number,
  capabilities?: Record<string, unknown>
): SendCallsParams {
  const result: SendCallsParams = {
    version: payload.version || '1.0',
    chainId: `0x${chainId.toString(16)}`,
    from: payload.from ? decodeAddress(payload.from) : undefined,
    calls: [],
    capabilities,
  };

  if (payload.transactionData.case === 'erc20Transfer') {
    const { token, recipient, amount } = payload.transactionData.value;

    // Reconstruct ERC20 transfer call data with proper 32-byte padding
    const recipientPadded = pad32(recipient);
    const amountPadded = pad32(amount.length > 0 ? amount : new Uint8Array([0]));

    // Convert to hex without minimal encoding (keep all padding)
    const recipientHex = Array.from(recipientPadded)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const amountHex = Array.from(amountPadded)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const data = ERC20_TRANSFER_SELECTOR + recipientHex + amountHex;

    result.calls = [
      {
        to: decodeAddress(token),
        data,
        value: '0x0',
      },
    ];
  } else if (payload.transactionData.case === 'nativeTransfer') {
    const { recipient, amount } = payload.transactionData.value;

    result.calls = [
      {
        to: decodeAddress(recipient),
        data: '0x',
        value: bytesToHex(amount.length > 0 ? amount : new Uint8Array([0])),
      },
    ];
  } else if (payload.transactionData.case === 'genericCalls') {
    const { calls } = payload.transactionData.value;

    result.calls = calls.map((call) => ({
      to: decodeAddress(call.to),
      data: call.data.length > 0 ? bytesToHex(call.data) : '0x',
      value: bytesToHex(call.value.length > 0 ? call.value : new Uint8Array([0])),
    }));
  }

  return result;
}
