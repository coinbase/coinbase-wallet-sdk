// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

/**
 * Protocol Buffers wire format encoding/decoding
 * Implements a subset of proto3 wire format for our message types
 */

import type {
  Call,
  Erc20Transfer,
  GenericCalls,
  GenericJsonRpc,
  GenericTypedData,
  NativeTransfer,
  ReceiveWithAuthorization,
  RpcLinkPayload,
  SpendPermission,
  WalletSendCalls,
  WalletSign,
} from '../types.js';
import { SendCallsType, SignType } from '../types.js';

// Wire types
const WIRE_TYPE_VARINT = 0;
const WIRE_TYPE_LENGTH_DELIMITED = 2;

/**
 * Encode a varint (unsigned)
 */
function encodeVarint(value: number | bigint): Uint8Array {
  const result: number[] = [];
  let n = typeof value === 'bigint' ? value : BigInt(value);

  if (n < 0n) {
    throw new Error('Cannot encode negative varint');
  }

  do {
    let byte = Number(n & 0x7fn);
    n >>= 7n;
    if (n !== 0n) {
      byte |= 0x80;
    }
    result.push(byte);
  } while (n !== 0n);

  return new Uint8Array(result);
}

/**
 * Decode a varint from buffer
 */
function decodeVarint(buffer: Uint8Array, offset: number): { value: bigint; length: number } {
  let value = 0n;
  let shift = 0n;
  let length = 0;

  while (offset + length < buffer.length) {
    const byte = buffer[offset + length];
    length++;

    value |= BigInt(byte & 0x7f) << shift;
    shift += 7n;

    if ((byte & 0x80) === 0) {
      return { value, length };
    }
  }

  throw new Error('Incomplete varint');
}

/**
 * Encode a length-delimited field
 */
function encodeBytes(fieldNumber: number, value: Uint8Array): Uint8Array {
  if (value.length === 0) return new Uint8Array(0); // Omit empty bytes

  const tag = (fieldNumber << 3) | WIRE_TYPE_LENGTH_DELIMITED;
  const tagBytes = encodeVarint(tag);
  const lengthBytes = encodeVarint(value.length);

  const result = new Uint8Array(tagBytes.length + lengthBytes.length + value.length);
  result.set(tagBytes, 0);
  result.set(lengthBytes, tagBytes.length);
  result.set(value, tagBytes.length + lengthBytes.length);

  return result;
}

/**
 * Encode a varint field
 */
function encodeVarintField(fieldNumber: number, value: number | bigint): Uint8Array {
  if (value === 0 || value === 0n) return new Uint8Array(0); // Omit zero values in proto3

  const tag = (fieldNumber << 3) | WIRE_TYPE_VARINT;
  const tagBytes = encodeVarint(tag);
  const valueBytes = encodeVarint(value);

  const result = new Uint8Array(tagBytes.length + valueBytes.length);
  result.set(tagBytes, 0);
  result.set(valueBytes, tagBytes.length);

  return result;
}

/**
 * Encode a string field
 */
function encodeString(fieldNumber: number, value: string): Uint8Array {
  if (!value) return new Uint8Array(0); // Omit empty strings

  const bytes = new TextEncoder().encode(value);
  return encodeBytes(fieldNumber, bytes);
}

/**
 * Encode a message field
 */
function encodeMessage(fieldNumber: number, value: Uint8Array): Uint8Array {
  if (value.length === 0) return new Uint8Array(0); // Omit empty messages

  return encodeBytes(fieldNumber, value);
}

/**
 * Concatenate byte arrays
 */
function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Encode Erc20Transfer message
 */
function encodeErc20Transfer(value: Erc20Transfer): Uint8Array {
  return concat(
    encodeBytes(1, value.token),
    encodeBytes(2, value.recipient),
    encodeBytes(3, value.amount)
  );
}

/**
 * Encode NativeTransfer message
 */
function encodeNativeTransfer(value: NativeTransfer): Uint8Array {
  return concat(encodeBytes(1, value.recipient), encodeBytes(2, value.amount));
}

/**
 * Encode Call message
 */
function encodeCall(value: Call): Uint8Array {
  return concat(encodeBytes(1, value.to), encodeBytes(2, value.data), encodeBytes(3, value.value));
}

/**
 * Encode GenericCalls message
 */
function encodeGenericCalls(value: GenericCalls): Uint8Array {
  const parts: Uint8Array[] = [];
  for (const call of value.calls) {
    const callBytes = encodeCall(call);
    parts.push(encodeMessage(1, callBytes));
  }
  return concat(...parts);
}

/**
 * Encode WalletSendCalls message
 */
export function encodeWalletSendCalls(value: WalletSendCalls): Uint8Array {
  const parts: Uint8Array[] = [encodeVarintField(1, value.type)];

  // Encode transaction data based on type
  if (value.transactionData.case === 'erc20Transfer') {
    const encoded = encodeErc20Transfer(value.transactionData.value);
    parts.push(encodeMessage(10, encoded));
  } else if (value.transactionData.case === 'nativeTransfer') {
    const encoded = encodeNativeTransfer(value.transactionData.value);
    parts.push(encodeMessage(11, encoded));
  } else if (value.transactionData.case === 'genericCalls') {
    const encoded = encodeGenericCalls(value.transactionData.value);
    parts.push(encodeMessage(12, encoded));
  }

  if (value.from) {
    parts.push(encodeBytes(3, value.from));
  }

  if (value.version) {
    parts.push(encodeString(4, value.version));
  }

  return concat(...parts);
}

/**
 * Encode SpendPermission message
 */
function encodeSpendPermission(value: SpendPermission): Uint8Array {
  return concat(
    encodeBytes(1, value.account),
    encodeBytes(2, value.spender),
    encodeBytes(3, value.token),
    encodeBytes(4, value.allowance),
    encodeVarintField(5, value.period),
    encodeVarintField(6, value.start),
    encodeVarintField(7, value.end),
    encodeBytes(8, value.salt),
    encodeBytes(9, value.extraData),
    encodeBytes(10, value.verifyingContract),
    encodeString(11, value.domainName),
    encodeString(12, value.domainVersion)
  );
}

/**
 * Encode ReceiveWithAuthorization message
 */
function encodeReceiveWithAuthorization(value: ReceiveWithAuthorization): Uint8Array {
  return concat(
    encodeBytes(1, value.from),
    encodeBytes(2, value.to),
    encodeBytes(3, value.value),
    encodeBytes(4, value.validAfter),
    encodeBytes(5, value.validBefore),
    encodeBytes(6, value.nonce),
    encodeBytes(7, value.verifyingContract),
    encodeString(8, value.domainName),
    encodeString(9, value.domainVersion)
  );
}

/**
 * Encode GenericTypedData message
 */
function encodeGenericTypedData(value: GenericTypedData): Uint8Array {
  return encodeBytes(1, value.typedDataJson);
}

/**
 * Encode WalletSign message
 */
export function encodeWalletSign(value: WalletSign): Uint8Array {
  const parts: Uint8Array[] = [encodeVarintField(1, value.type)];

  if (value.signatureData.case === 'spendPermission') {
    const encoded = encodeSpendPermission(value.signatureData.value);
    parts.push(encodeMessage(10, encoded));
  } else if (value.signatureData.case === 'receiveWithAuthorization') {
    const encoded = encodeReceiveWithAuthorization(value.signatureData.value);
    parts.push(encodeMessage(11, encoded));
  } else if (value.signatureData.case === 'genericTypedData') {
    const encoded = encodeGenericTypedData(value.signatureData.value);
    parts.push(encodeMessage(12, encoded));
  }

  if (value.version) {
    parts.push(encodeString(3, value.version));
  }

  return concat(...parts);
}

/**
 * Encode GenericJsonRpc message
 */
export function encodeGenericJsonRpc(value: GenericJsonRpc): Uint8Array {
  return concat(
    encodeString(1, value.method),
    encodeBytes(2, value.paramsJson),
    encodeString(3, value.rpcVersion || '')
  );
}

/**
 * Encode map field (for capabilities)
 */
function encodeMap(fieldNumber: number, map: Map<string, Uint8Array>): Uint8Array {
  const parts: Uint8Array[] = [];

  for (const [key, value] of map.entries()) {
    // Each map entry is encoded as a message with field 1 = key, field 2 = value
    const entryBytes = concat(encodeString(1, key), encodeBytes(2, value));
    parts.push(encodeMessage(fieldNumber, entryBytes));
  }

  return concat(...parts);
}

/**
 * Encode RpcLinkPayload message
 */
export function encodeRpcLinkPayload(value: RpcLinkPayload): Uint8Array {
  const parts: Uint8Array[] = [
    encodeVarintField(1, value.protocolVersion),
    encodeVarintField(2, value.chainId || 0),
    encodeVarintField(3, value.shortcutId),
    encodeVarintField(4, value.shortcutVersion),
  ];

  // Encode body based on shortcut
  if (value.body.case === 'generic') {
    const encoded = encodeGenericJsonRpc(value.body.value);
    parts.push(encodeMessage(10, encoded));
  } else if (value.body.case === 'walletSendCalls') {
    const encoded = encodeWalletSendCalls(value.body.value);
    parts.push(encodeMessage(11, encoded));
  } else if (value.body.case === 'walletSign') {
    const encoded = encodeWalletSign(value.body.value);
    parts.push(encodeMessage(12, encoded));
  }

  // Encode capabilities map
  if (value.capabilities && value.capabilities.size > 0) {
    parts.push(encodeMap(20, value.capabilities));
  }

  return concat(...parts);
}

/**
 * Decode a protobuf message
 * This is a simplified decoder that reads fields sequentially
 */
export function decodeRpcLinkPayload(buffer: Uint8Array): RpcLinkPayload {
  const fields = parseFields(buffer);

  const protocolVersion = Number(fields.get(1) || 0n);
  const chainId = fields.get(2) ? Number(fields.get(2)) : undefined;
  const shortcutId = Number(fields.get(3) || 0n);
  const shortcutVersion = Number(fields.get(4) || 0n);

  let body: RpcLinkPayload['body'] = { case: undefined };

  // Decode body based on which field is present
  if (fields.has(10)) {
    const genericBytes = fields.get(10) as Uint8Array;
    body = { case: 'generic', value: decodeGenericJsonRpc(genericBytes) };
  } else if (fields.has(11)) {
    const sendCallsBytes = fields.get(11) as Uint8Array;
    body = { case: 'walletSendCalls', value: decodeWalletSendCalls(sendCallsBytes) };
  } else if (fields.has(12)) {
    const signBytes = fields.get(12) as Uint8Array;
    body = { case: 'walletSign', value: decodeWalletSign(signBytes) };
  }

  // Decode capabilities map
  const capabilities = fields.get(20) ? (fields.get(20) as Map<string, Uint8Array>) : undefined;

  return {
    protocolVersion,
    chainId,
    shortcutId,
    shortcutVersion,
    body,
    capabilities,
  };
}

/**
 * Parse protobuf fields from buffer
 */
function parseFields(
  buffer: Uint8Array
): Map<number, bigint | Uint8Array | Map<string, Uint8Array>> {
  const fields = new Map<number, bigint | Uint8Array | Map<string, Uint8Array>>();
  let offset = 0;

  while (offset < buffer.length) {
    const { value: tag, length: tagLength } = decodeVarint(buffer, offset);
    offset += tagLength;

    const fieldNumber = Number(tag >> 3n);
    const wireType = Number(tag & 0x7n);

    if (wireType === WIRE_TYPE_VARINT) {
      const { value, length } = decodeVarint(buffer, offset);
      offset += length;
      fields.set(fieldNumber, value);
    } else if (wireType === WIRE_TYPE_LENGTH_DELIMITED) {
      const { value: length, length: lengthSize } = decodeVarint(buffer, offset);
      offset += lengthSize;

      const bytes = buffer.slice(offset, offset + Number(length));
      offset += Number(length);

      // Field 20 is the capabilities map
      if (fieldNumber === 20) {
        if (!fields.has(20)) {
          fields.set(20, new Map<string, Uint8Array>());
        }
        const mapField = fields.get(20) as Map<string, Uint8Array>;
        const entry = parseMapEntry(bytes);
        mapField.set(entry.key, entry.value);
      } else {
        fields.set(fieldNumber, bytes);
      }
    } else {
      throw new Error(`Unsupported wire type: ${wireType}`);
    }
  }

  return fields;
}

/**
 * Parse a map entry (key-value pair)
 */
function parseMapEntry(buffer: Uint8Array): { key: string; value: Uint8Array } {
  const fields = parseFields(buffer);
  const keyBytes = fields.get(1) as Uint8Array;
  const valueBytes = fields.get(2) as Uint8Array;

  if (!keyBytes || !valueBytes) {
    throw new Error('Invalid map entry: missing key or value');
  }

  const key = new TextDecoder().decode(keyBytes);
  return { key, value: valueBytes };
}

/**
 * Decode GenericJsonRpc message
 */
function decodeGenericJsonRpc(buffer: Uint8Array): GenericJsonRpc {
  const fields = parseFields(buffer);

  const methodBytes = fields.get(1) as Uint8Array;
  const paramsJsonBytes = fields.get(2) as Uint8Array;
  const rpcVersionBytes = fields.get(3) as Uint8Array | undefined;

  return {
    method: new TextDecoder().decode(methodBytes || new Uint8Array()),
    paramsJson: paramsJsonBytes || new Uint8Array(),
    rpcVersion: rpcVersionBytes ? new TextDecoder().decode(rpcVersionBytes) : undefined,
  };
}

/**
 * Decode WalletSendCalls message
 */
function decodeWalletSendCalls(buffer: Uint8Array): WalletSendCalls {
  const fields = parseFields(buffer);

  const type = Number(fields.get(1) || 0n) as SendCallsType;
  const fromBytes = fields.get(3) as Uint8Array | undefined;
  const versionBytes = fields.get(4) as Uint8Array | undefined;

  let transactionData: WalletSendCalls['transactionData'] = { case: undefined };

  if (fields.has(10)) {
    const erc20Bytes = fields.get(10) as Uint8Array;
    transactionData = { case: 'erc20Transfer', value: decodeErc20Transfer(erc20Bytes) };
  } else if (fields.has(11)) {
    const nativeBytes = fields.get(11) as Uint8Array;
    transactionData = { case: 'nativeTransfer', value: decodeNativeTransfer(nativeBytes) };
  } else if (fields.has(12)) {
    const genericBytes = fields.get(12) as Uint8Array;
    transactionData = { case: 'genericCalls', value: decodeGenericCalls(genericBytes) };
  }

  return {
    type,
    transactionData,
    from: fromBytes,
    version: versionBytes ? new TextDecoder().decode(versionBytes) : undefined,
  };
}

/**
 * Decode Erc20Transfer message
 */
function decodeErc20Transfer(buffer: Uint8Array): Erc20Transfer {
  const fields = parseFields(buffer);

  return {
    token: (fields.get(1) as Uint8Array) || new Uint8Array(),
    recipient: (fields.get(2) as Uint8Array) || new Uint8Array(),
    amount: (fields.get(3) as Uint8Array) || new Uint8Array(),
  };
}

/**
 * Decode NativeTransfer message
 */
function decodeNativeTransfer(buffer: Uint8Array): NativeTransfer {
  const fields = parseFields(buffer);

  return {
    recipient: (fields.get(1) as Uint8Array) || new Uint8Array(),
    amount: (fields.get(2) as Uint8Array) || new Uint8Array(),
  };
}

/**
 * Decode Call message
 */
function decodeCall(buffer: Uint8Array): Call {
  const fields = parseFields(buffer);

  return {
    to: (fields.get(1) as Uint8Array) || new Uint8Array(),
    data: (fields.get(2) as Uint8Array) || new Uint8Array(),
    value: (fields.get(3) as Uint8Array) || new Uint8Array(),
  };
}

/**
 * Decode GenericCalls message
 */
function decodeGenericCalls(buffer: Uint8Array): GenericCalls {
  const calls: Call[] = [];
  let offset = 0;

  while (offset < buffer.length) {
    const { value: tag, length: tagLength } = decodeVarint(buffer, offset);
    offset += tagLength;

    const fieldNumber = Number(tag >> 3n);
    const wireType = Number(tag & 0x7n);

    if (fieldNumber === 1 && wireType === WIRE_TYPE_LENGTH_DELIMITED) {
      const { value: length, length: lengthSize } = decodeVarint(buffer, offset);
      offset += lengthSize;

      const callBytes = buffer.slice(offset, offset + Number(length));
      offset += Number(length);

      calls.push(decodeCall(callBytes));
    } else {
      throw new Error(`Unexpected field in GenericCalls: ${fieldNumber}`);
    }
  }

  return { calls };
}

/**
 * Decode WalletSign message
 */
function decodeWalletSign(buffer: Uint8Array): WalletSign {
  const fields = parseFields(buffer);

  const type = Number(fields.get(1) || 0n) as SignType;
  const versionBytes = fields.get(3) as Uint8Array | undefined;

  let signatureData: WalletSign['signatureData'] = { case: undefined };

  if (fields.has(10)) {
    const spendBytes = fields.get(10) as Uint8Array;
    signatureData = { case: 'spendPermission', value: decodeSpendPermission(spendBytes) };
  } else if (fields.has(11)) {
    const receiveBytes = fields.get(11) as Uint8Array;
    signatureData = {
      case: 'receiveWithAuthorization',
      value: decodeReceiveWithAuthorization(receiveBytes),
    };
  } else if (fields.has(12)) {
    const genericBytes = fields.get(12) as Uint8Array;
    signatureData = { case: 'genericTypedData', value: decodeGenericTypedData(genericBytes) };
  }

  return {
    type,
    signatureData,
    version: versionBytes ? new TextDecoder().decode(versionBytes) : undefined,
  };
}

/**
 * Decode SpendPermission message
 */
function decodeSpendPermission(buffer: Uint8Array): SpendPermission {
  const fields = parseFields(buffer);

  return {
    account: (fields.get(1) as Uint8Array) || new Uint8Array(),
    spender: (fields.get(2) as Uint8Array) || new Uint8Array(),
    token: (fields.get(3) as Uint8Array) || new Uint8Array(),
    allowance: (fields.get(4) as Uint8Array) || new Uint8Array(),
    period: (fields.get(5) as bigint) || 0n,
    start: (fields.get(6) as bigint) || 0n,
    end: (fields.get(7) as bigint) || 0n,
    salt: (fields.get(8) as Uint8Array) || new Uint8Array(),
    extraData: (fields.get(9) as Uint8Array) || new Uint8Array(),
    verifyingContract: (fields.get(10) as Uint8Array) || new Uint8Array(),
    domainName: new TextDecoder().decode((fields.get(11) as Uint8Array) || new Uint8Array()),
    domainVersion: new TextDecoder().decode((fields.get(12) as Uint8Array) || new Uint8Array()),
  };
}

/**
 * Decode ReceiveWithAuthorization message
 */
function decodeReceiveWithAuthorization(buffer: Uint8Array): ReceiveWithAuthorization {
  const fields = parseFields(buffer);

  return {
    from: (fields.get(1) as Uint8Array) || new Uint8Array(),
    to: (fields.get(2) as Uint8Array) || new Uint8Array(),
    value: (fields.get(3) as Uint8Array) || new Uint8Array(),
    validAfter: (fields.get(4) as Uint8Array) || new Uint8Array(),
    validBefore: (fields.get(5) as Uint8Array) || new Uint8Array(),
    nonce: (fields.get(6) as Uint8Array) || new Uint8Array(),
    verifyingContract: (fields.get(7) as Uint8Array) || new Uint8Array(),
    domainName: new TextDecoder().decode((fields.get(8) as Uint8Array) || new Uint8Array()),
    domainVersion: new TextDecoder().decode((fields.get(9) as Uint8Array) || new Uint8Array()),
  };
}

/**
 * Decode GenericTypedData message
 */
function decodeGenericTypedData(buffer: Uint8Array): GenericTypedData {
  const fields = parseFields(buffer);

  return {
    typedDataJson: (fields.get(1) as Uint8Array) || new Uint8Array(),
  };
}
