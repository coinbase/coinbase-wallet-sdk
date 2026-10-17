import type { EvmSmartAccount } from '@coinbase/cdp-sdk';
import type { PrepareChargeCall } from '../types.js';

/**
 * Sends a user operation and waits for it to complete.
 * Handles error cases and provides consistent error messages.
 *
 * @param networkSmartWallet - Network-scoped smart wallet instance
 * @param calls - Array of calls to execute
 * @param paymasterUrl - Optional paymaster URL for gas sponsorship
 * @param timeoutSeconds - Timeout in seconds (default: 60)
 * @param context - Context string for error messages (e.g., "charge", "revoke")
 * @returns Transaction hash of the completed operation
 * @throws Error if operation fails or times out
 */
export async function sendUserOpAndWait(
  networkSmartWallet: Awaited<ReturnType<EvmSmartAccount['useNetwork']>>,
  calls: PrepareChargeCall[],
  paymasterUrl: string | undefined,
  timeoutSeconds: number,
  context: string
): Promise<string> {
  try {
    // Send the user operation
    const userOpResult = await networkSmartWallet.sendUserOperation({
      calls,
      ...(paymasterUrl && { paymasterUrl }),
    });

    // The sendUserOperation returns { smartAccountAddress, status: "broadcast", userOpHash }
    // We need to wait for the operation to complete to get the transaction hash
    const completedOp = await networkSmartWallet.waitForUserOperation({
      userOpHash: userOpResult.userOpHash,
      waitOptions: {
        timeoutSeconds,
      },
    });

    // Check if the operation was successful
    if (completedOp.status === 'failed') {
      throw new Error(`User operation failed: ${userOpResult.userOpHash}`);
    }

    // For completed operations, we have the transaction hash
    const transactionHash = completedOp.transactionHash;

    if (!transactionHash) {
      throw new Error('No transaction hash received from operation');
    }

    return transactionHash;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to execute ${context} transaction with smart wallet: ${errorMessage}`);
  }
}
