import type { Abi } from 'viem';

/**
 * A single contract call configuration for multicall
 */
export type ContractCall = {
  /** Contract address */
  address: `0x${string}`;
  /** Contract ABI */
  abi: Abi;
  /** Function name to call */
  functionName: string;
  /** Function arguments */
  args?: readonly unknown[];
};

/**
 * Result of a successful multicall operation
 */
export type MulticallSuccess<T = unknown> = {
  status: 'success';
  result: T;
};

/**
 * Result of a failed multicall operation
 */
export type MulticallFailure = {
  status: 'failure';
  error: Error;
};

/**
 * Union type for multicall results
 */
export type MulticallResult<T = unknown> = MulticallSuccess<T> | MulticallFailure;

/**
 * Options for multicall execution
 */
export type MulticallOptions = {
  /**
   * Whether to allow partial failures. If false, the entire operation
   * will throw if any call fails. If true, individual failures will be
   * returned in the results array.
   * @default false
   */
  allowPartialFailure?: boolean;
  /**
   * Custom error messages for each call (indexed)
   */
  errorMessages?: string[];
};

/**
 * Typed multicall result extractor
 */
export type ExtractMulticallResults<T extends readonly ContractCall[]> = {
  [K in keyof T]: unknown;
};
