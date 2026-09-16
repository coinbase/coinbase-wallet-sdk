// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

/**
 * Protocol Buffers message types for Prolink encoding
 * Based on the Compressed RPC Link Format ERC specification
 */

/**
 * Transaction type discriminator for wallet_sendCalls
 */
export enum SendCallsType {
  SEND_CALLS_UNKNOWN = 0,
  ERC20_TRANSFER = 1,
  NATIVE_TRANSFER = 2,
  GENERIC_CALLS = 3,
}

/**
 * Signature type discriminator for wallet_sign
 */
export enum SignType {
  SIGN_UNKNOWN = 0,
  SPEND_PERMISSION = 1,
  RECEIVE_WITH_AUTHORIZATION = 2,
  GENERIC_TYPED_DATA = 3,
}

/**
 * ERC20 transfer data
 */
export type Erc20Transfer = {
  token: Uint8Array; // 20-byte ERC20 token contract address
  recipient: Uint8Array; // 20-byte recipient address
  amount: Uint8Array; // Amount in token's smallest unit (big-endian bytes, minimal encoding)
};

/**
 * Native transfer data
 */
export type NativeTransfer = {
  recipient: Uint8Array; // 20-byte recipient address
  amount: Uint8Array; // Amount in wei (big-endian bytes, minimal encoding)
};

/**
 * Generic call data
 */
export type Call = {
  to: Uint8Array; // 20-byte contract/EOA address
  data: Uint8Array; // Calldata (may be empty)
  value: Uint8Array; // Value in wei (big-endian bytes, minimal encoding)
};

/**
 * Generic calls data
 */
export type GenericCalls = {
  calls: Call[];
};

/**
 * wallet_sendCalls message
 */
export type WalletSendCalls = {
  type: SendCallsType;
  transactionData:
    | { case: 'erc20Transfer'; value: Erc20Transfer }
    | { case: 'nativeTransfer'; value: NativeTransfer }
    | { case: 'genericCalls'; value: GenericCalls }
    | { case: undefined; value?: undefined };
  from?: Uint8Array; // 20-byte address (optional)
  version?: string; // RPC version (e.g., "1.0")
};

/**
 * Spend permission data
 */
export type SpendPermission = {
  // EIP-712 message fields
  account: Uint8Array; // 20-byte account address
  spender: Uint8Array; // 20-byte spender address
  token: Uint8Array; // 20-byte token address
  allowance: Uint8Array; // uint160 (big-endian bytes, minimal encoding)
  period: bigint; // uint48
  start: bigint; // uint48
  end: bigint; // uint48
  salt: Uint8Array; // 32-byte salt
  extraData: Uint8Array; // extraData (may be empty for "0x")

  // EIP-712 domain fields
  verifyingContract: Uint8Array; // 20-byte verifyingContract
  domainName: string; // Domain name
  domainVersion: string; // Domain version
};

/**
 * Receive with authorization data
 */
export type ReceiveWithAuthorization = {
  // EIP-712 message fields
  from: Uint8Array; // 20-byte from address
  to: Uint8Array; // 20-byte to address
  value: Uint8Array; // uint256 (big-endian bytes, minimal encoding)
  validAfter: Uint8Array; // uint256 (typically 0)
  validBefore: Uint8Array; // uint256 (timestamp)
  nonce: Uint8Array; // bytes32

  // EIP-712 domain fields
  verifyingContract: Uint8Array; // 20-byte USDC contract
  domainName: string; // Domain name
  domainVersion: string; // Domain version
};

/**
 * Generic typed data
 */
export type GenericTypedData = {
  typedDataJson: Uint8Array; // UTF-8 JSON-encoded EIP-712 TypedData
};

/**
 * wallet_sign message
 */
export type WalletSign = {
  type: SignType;
  signatureData:
    | { case: 'spendPermission'; value: SpendPermission }
    | { case: 'receiveWithAuthorization'; value: ReceiveWithAuthorization }
    | { case: 'genericTypedData'; value: GenericTypedData }
    | { case: undefined; value?: undefined };
  version?: string; // RPC version
};

/**
 * Generic JSON-RPC message
 */
export type GenericJsonRpc = {
  method: string; // JSON-RPC method name
  paramsJson: Uint8Array; // UTF-8 JSON-encoded params
  rpcVersion?: string; // Optional JSON-RPC version
};

/**
 * Core RPC link payload
 */
export type RpcLinkPayload = {
  protocolVersion: number; // Core payload version (1)
  chainId?: number; // Canonical numeric chain ID
  shortcutId: number; // 0 = GENERIC_JSON_RPC, 1 = WALLET_SEND_CALLS, 2 = WALLET_SIGN
  shortcutVersion: number; // Shortcut-specific version
  body:
    | { case: 'generic'; value: GenericJsonRpc }
    | { case: 'walletSendCalls'; value: WalletSendCalls }
    | { case: 'walletSign'; value: WalletSign }
    | { case: undefined; value?: undefined };
  capabilities?: Map<string, Uint8Array>; // Extension point for metadata
};

/**
 * High-level request type for encoding
 */
export type ProlinkRequest = {
  method: string;
  params: unknown;
  chainId?: number;
  capabilities?: Record<string, unknown>;
};

/**
 * High-level decoded type
 */
export type ProlinkDecoded = {
  method: string;
  params: unknown;
  chainId?: number;
  capabilities?: Record<string, unknown>;
};
