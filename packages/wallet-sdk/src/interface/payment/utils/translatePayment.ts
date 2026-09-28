import { encodeFunctionData, parseUnits, toHex, type Address, type Hex } from 'viem';
import { CHAIN_IDS, ERC20_TRANSFER_ABI, TOKENS } from '../constants.js';
import type { PayerInfo } from '../types.js';

/**
 * Encodes an ERC20 transfer call
 * @param recipient - The recipient address
 * @param amount - The amount in USDC (will be converted to 6 decimals)
 * @returns The encoded function data
 */
export function encodeTransferCall(recipient: Address, amount: string): Hex {
  const amountInUnits = parseUnits(amount, TOKENS.USDC.decimals);

  // Encode the transfer function call
  return encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [recipient, amountInUnits],
  });
}

/**
 * Builds the wallet_sendCalls request parameters
 * @param transferData - The encoded transfer call data
 * @param testnet - Whether to use testnet
 * @param payerInfo - Optional payer information configuration for data callbacks
 * @param dataSuffix - Optional 0x-prefixed hex attribution suffix
 * @returns The request parameters for wallet_sendCalls
 */
export function buildSendCallsRequest(
  transferData: Hex,
  testnet: boolean,
  payerInfo?: PayerInfo,
  dataSuffix?: Hex
) {
  const network = testnet ? 'baseSepolia' : 'base';
  const chainId = CHAIN_IDS[network];
  const usdcAddress = TOKENS.USDC.addresses[network];

  // Build the call object
  const call = {
    to: usdcAddress as Address,
    data: transferData,
    value: toHex(0n), // No ETH value for ERC20 transfer
  };

  // Build the capabilities object
  const capabilities: Record<string, unknown> = {};

  // Add dataCallback capability if payerInfo is provided
  if (payerInfo && payerInfo.requests.length > 0) {
    capabilities.dataCallback = {
      requests: payerInfo.requests.map((request) => ({
        type: request.type,
        optional: request.optional ?? false,
      })),
      ...(payerInfo.callbackURL && { callbackURL: payerInfo.callbackURL }),
    };
  }

  if (dataSuffix) {
    capabilities.attribution = { suffix: dataSuffix };
  }

  // Build the request parameters
  const requestParams = {
    version: '2.0.0',
    chainId: chainId,
    calls: [call],
    capabilities,
  };

  return requestParams;
}

/**
 * Translates payment options into a wallet_sendCalls request
 * @param recipient - The recipient address
 * @param amount - The amount to send
 * @param testnet - Whether to use testnet
 * @param payerInfo - Optional payer information configuration for data callbacks
 * @param dataSuffix - Optional 0x-prefixed hex attribution suffix
 * @returns The complete request parameters
 */
export function translatePaymentToSendCalls(
  recipient: Address,
  amount: string,
  testnet: boolean,
  payerInfo?: PayerInfo,
  dataSuffix?: Hex
) {
  // Encode the transfer call
  const transferData = encodeTransferCall(recipient, amount);

  // Build and return the sendCalls request
  return buildSendCallsRequest(transferData, testnet, payerInfo, dataSuffix);
}
