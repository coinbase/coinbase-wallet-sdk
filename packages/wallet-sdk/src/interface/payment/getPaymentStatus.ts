import type { Address, Hex } from 'viem';
import { decodeEventLog, formatUnits, getAddress, isAddressEqual, parseUnits } from 'viem';

import {
  logPaymentStatusCheckCompleted,
  logPaymentStatusCheckError,
  logPaymentStatusCheckStarted,
} from ':core/telemetry/events/payment.js';
import {
  DEFAULT_BUNDLER_HEADERS,
  DEFAULT_BUNDLER_URLS,
  ERC20_TRANSFER_ABI,
  TOKENS,
} from './constants.js';
import type { PaymentStatus, PaymentStatusOptions } from './types.js';
import { validateStringAmount } from './utils/validation.js';

interface JsonRpcResponse {
  result: Record<string, unknown> | null;
}

interface ValidatedExpectedPayment {
  amount: bigint;
  recipient: Address;
}

function getDefaultBundlerUrl(testnet: boolean): string {
  return testnet ? DEFAULT_BUNDLER_URLS.baseSepolia : DEFAULT_BUNDLER_URLS.base;
}

function getBundlerRequestHeaders(usingDefaultBundlerUrl: boolean): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(usingDefaultBundlerUrl ? DEFAULT_BUNDLER_HEADERS : {}),
  };
}

function getRpcErrorMessage(response: unknown): string | undefined {
  if (!response || typeof response !== 'object' || !('error' in response)) {
    return undefined;
  }

  const rpcError = (response as { error?: unknown }).error;
  if (rpcError === undefined || rpcError === null) {
    return undefined;
  }

  if (
    typeof rpcError === 'object' &&
    'message' in rpcError &&
    typeof rpcError.message === 'string' &&
    rpcError.message
  ) {
    return rpcError.message;
  }

  return 'Network error';
}

async function readJsonRpcResponse(response: Response): Promise<JsonRpcResponse> {
  const hasHttpError =
    response.ok === false ||
    (typeof response.ok !== 'boolean' &&
      typeof response.status === 'number' &&
      (response.status < 200 || response.status >= 300));
  if (hasHttpError) {
    throw new Error(`RPC request failed with HTTP status ${response.status}`);
  }

  const body = await response.json();
  const rpcErrorMessage = getRpcErrorMessage(body);
  if (rpcErrorMessage) {
    throw new Error(`RPC error: ${rpcErrorMessage}`);
  }

  if (!body || typeof body !== 'object' || !('result' in body)) {
    throw new Error('RPC error: Invalid response');
  }

  const result = (body as { result: unknown }).result;
  if (result !== null && (typeof result !== 'object' || Array.isArray(result))) {
    throw new Error('RPC error: Invalid response');
  }

  return body as JsonRpcResponse;
}

/**
 * Check the status of a payment transaction using its transaction ID (userOp hash)
 *
 * @param options - Payment status check options
 * @param options.id - Transaction ID (userOp hash) to check status for
 * @param options.expectedPayment - Optional trusted amount and recipient to verify
 * @param options.testnet - Whether to check on testnet (Base Sepolia). Defaults to false (mainnet)
 * @param options.telemetry - Whether to enable telemetry logging. Defaults to true
 * @param options.bundlerUrl - Optional custom bundler URL to use for status checks. Useful for avoiding rate limits on public endpoints.
 * @returns Promise<PaymentStatus> - Status information about the payment
 * @throws Error if the RPC request fails, the receipt does not contain exactly one positive
 * sender-origin USDC transfer, or the transfer does not match the expected payment
 *
 * @example
 * ```typescript
 * try {
 *   const status = await getPaymentStatus({
 *     id: "0x1234...5678",
 *     expectedPayment: {
 *       amount: "10.50",
 *       recipient: "0xFe21034794A5a574B94fE4fDfD16e005F1C96e51"
 *     },
 *     testnet: true
 *   })
 *
 *   // With a trusted custom bundler URL to avoid rate limits
 *   const customStatus = await getPaymentStatus({
 *     id: "0x1234...5678",
 *     expectedPayment: {
 *       amount: "10.50",
 *       recipient: "0xFe21034794A5a574B94fE4fDfD16e005F1C96e51"
 *     },
 *     testnet: false,
 *     bundlerUrl: 'https://my-bundler.example.com/rpc'
 *   })
 *
 *   if (status.status === 'failed') {
 *     console.info(`Payment failed: ${status.reason}`)
 *   }
 * } catch (error) {
 *   console.error('Unable to check payment status:', error.message)
 * }
 * ```
 *
 * @note The id is the userOp hash returned from the pay function
 */
export async function getPaymentStatus(options: PaymentStatusOptions): Promise<PaymentStatus> {
  const { id, expectedPayment, testnet = false, telemetry = true, bundlerUrl } = options;

  // Generate correlation ID for this status check
  const correlationId = crypto.randomUUID();

  // Log status check started
  if (telemetry) {
    logPaymentStatusCheckStarted({ testnet, correlationId });
  }

  try {
    if (typeof id !== 'string' || !id) {
      throw new Error('Unable to verify payment: transaction ID is invalid.');
    }

    let validatedExpectedPayment: ValidatedExpectedPayment | undefined;
    if (expectedPayment !== undefined) {
      // Defend JavaScript callers that do not get the PaymentStatusOptions type checks.
      if (
        !expectedPayment ||
        typeof expectedPayment.amount !== 'string' ||
        typeof expectedPayment.recipient !== 'string'
      ) {
        throw new Error('Unable to verify payment: expected payment details are invalid.');
      }

      let expectedAmount: bigint;
      try {
        validateStringAmount(expectedPayment.amount, TOKENS.USDC.decimals);
        expectedAmount = parseUnits(expectedPayment.amount, TOKENS.USDC.decimals);
      } catch {
        throw new Error('Unable to verify payment: expected USDC amount is invalid.');
      }

      let expectedRecipient: Address;
      try {
        expectedRecipient = getAddress(expectedPayment.recipient);
      } catch {
        throw new Error('Unable to verify payment: expected recipient address is invalid.');
      }

      validatedExpectedPayment = {
        amount: expectedAmount,
        recipient: expectedRecipient,
      };
    }

    const usingDefaultBundlerUrl = !bundlerUrl;
    const effectiveBundlerUrl = bundlerUrl || getDefaultBundlerUrl(testnet);
    const headers = getBundlerRequestHeaders(usingDefaultBundlerUrl);

    // Call eth_getUserOperationReceipt via the bundler
    const receipt = await fetch(effectiveBundlerUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getUserOperationReceipt',
        params: [id],
      }),
    }).then(readJsonRpcResponse);

    // If no result, payment is still pending or not found
    if (!receipt.result) {
      // Try eth_getUserOperationByHash to see if it's in mempool
      const userOpResponse = await fetch(effectiveBundlerUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_getUserOperationByHash',
          params: [id],
        }),
      }).then(readJsonRpcResponse);

      if (userOpResponse.result) {
        if (typeof userOpResponse.result.sender !== 'string') {
          throw new Error('RPC error: Invalid response');
        }
        try {
          getAddress(userOpResponse.result.sender);
        } catch {
          throw new Error('RPC error: Invalid response');
        }

        // UserOp exists but no receipt yet - it's pending
        if (telemetry) {
          logPaymentStatusCheckCompleted({ testnet, status: 'pending', correlationId });
        }
        const result = {
          status: 'pending' as const,
          id: id as Hex,
          message: 'Your payment is being processed. This usually takes a few seconds.',
          sender: userOpResponse.result.sender,
        };
        return result;
      }

      // Not found at all
      if (telemetry) {
        logPaymentStatusCheckCompleted({ testnet, status: 'not_found', correlationId });
      }
      const result = {
        status: 'not_found' as const,
        id: id as Hex,
        message: 'Payment not found. Please check your transaction ID.',
      };
      return result;
    }

    const userOpReceipt = receipt.result;
    if (
      typeof userOpReceipt.userOpHash !== 'string' ||
      userOpReceipt.userOpHash.toLowerCase() !== id.toLowerCase()
    ) {
      throw new Error(
        'Unable to verify payment: receipt does not match the requested transaction.'
      );
    }

    const { success, reason } = userOpReceipt;
    if (typeof success !== 'boolean') {
      throw new Error('RPC error: Invalid response');
    }
    if (reason !== undefined && reason !== null && typeof reason !== 'string') {
      throw new Error('RPC error: Invalid response');
    }
    if (typeof userOpReceipt.sender !== 'string') {
      throw new Error('Unable to verify payment: receipt is missing a valid sender address.');
    }

    let senderAddress: Address;
    try {
      senderAddress = getAddress(userOpReceipt.sender);
    } catch {
      throw new Error('Unable to verify payment: receipt is missing a valid sender address.');
    }

    // Determine status based on success flag
    if (success === true) {
      // ERC-7769 top-level logs are scoped to this UserOperation. Transaction receipt logs include
      // every UserOperation in the bundle and must not be used for payment verification.
      if (!Array.isArray(userOpReceipt.logs)) {
        throw new Error('Unable to verify payment: user operation receipt is missing logs.');
      }

      const network = testnet ? 'baseSepolia' : 'base';
      const usdcAddress = TOKENS.USDC.addresses[network].toLowerCase();

      // Collect all USDC transfers
      const usdcTransfers: Array<{
        from: Address;
        to: Address;
        value: bigint;
        formattedAmount: string;
      }> = [];

      for (const log of userOpReceipt.logs) {
        // Check if this is a USDC log
        const logAddressLower = log?.address?.toLowerCase();
        const isUsdcLog = logAddressLower === usdcAddress;

        if (isUsdcLog) {
          try {
            const decoded = decodeEventLog({
              abi: ERC20_TRANSFER_ABI,
              data: log.data,
              topics: log.topics,
            });

            if (decoded.eventName === 'Transfer') {
              const { from, to, value } = decoded.args;
              usdcTransfers.push({
                from,
                to,
                value,
                formattedAmount: formatUnits(value, TOKENS.USDC.decimals),
              });
            }
          } catch (_e) {
            // Do not fail here - fail when we can't find a single valid transfer
          }
        }
      }

      // Find the payment transfer from the sender (smart wallet) address.
      const senderTransfers = usdcTransfers.filter((transfer) => {
        try {
          return isAddressEqual(transfer.from, senderAddress);
        } catch {
          return false;
        }
      });

      if (senderTransfers.length === 0) {
        throw new Error(
          `Unable to find USDC transfer from sender wallet ${userOpReceipt.sender}. ` +
            `Found ${usdcTransfers.length} USDC transfer(s) but none originated from the sender wallet.`
        );
      }
      if (senderTransfers.length > 1) {
        const transferDetails = senderTransfers
          .map((transfer) => `${transfer.formattedAmount} USDC to ${transfer.to}`)
          .join(', ');
        throw new Error(
          `Found multiple USDC transfers from sender wallet ${userOpReceipt.sender}: ${transferDetails}. Expected exactly one transfer.`
        );
      }

      const [paymentTransfer] = senderTransfers;
      if (paymentTransfer.value <= 0n) {
        throw new Error(
          'Unable to verify payment: USDC transfer amount must be greater than zero.'
        );
      }

      if (validatedExpectedPayment) {
        if (paymentTransfer.value !== validatedExpectedPayment.amount) {
          throw new Error(
            'Unable to verify payment: USDC amount does not match the expected amount.'
          );
        }

        if (!isAddressEqual(paymentTransfer.to, validatedExpectedPayment.recipient)) {
          throw new Error(
            'Unable to verify payment: USDC recipient does not match the expected recipient.'
          );
        }
      }

      if (telemetry) {
        logPaymentStatusCheckCompleted({ testnet, status: 'completed', correlationId });
      }
      const result = {
        status: 'completed' as const,
        id: id as Hex,
        message: 'Payment completed successfully',
        sender: userOpReceipt.sender,
        amount: paymentTransfer.formattedAmount,
        recipient: paymentTransfer.to,
      };
      return result;
    }
    // else block - Parse a user-friendly reason for failure
    let userFriendlyReason = 'Payment could not be completed';

    if (reason) {
      if (reason.toLowerCase().includes('insufficient')) {
        userFriendlyReason = 'Insufficient USDC balance';
      } else {
        userFriendlyReason = reason;
      }
    }

    if (telemetry) {
      logPaymentStatusCheckCompleted({ testnet, status: 'failed', correlationId });
    }
    const result = {
      status: 'failed' as const,
      id: id as Hex,
      message: 'Payment failed',
      sender: userOpReceipt.sender,
      reason: userFriendlyReason,
    };
    return result;
  } catch (error) {
    console.error('[getPaymentStatus] Error checking status:', error);

    const errorMessage = error instanceof Error ? error.message : 'Connection error';
    if (telemetry) {
      logPaymentStatusCheckError({ testnet, correlationId, errorMessage });
    }

    // Re-throw the error
    throw error;
  }
}
