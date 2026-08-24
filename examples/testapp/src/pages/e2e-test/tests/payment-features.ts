/**
 * Payment Features Tests
 *
 * Tests for one-time payment functionality via base.pay() and status checking.
 */

import type { TestContext, TestHandlers } from '../types';
import { runTest } from '../utils/test-helpers';

/**
 * Test creating a payment with base.pay()
 */
export async function testPay(
  handlers: TestHandlers,
  context: TestContext
): Promise<{ id: string } | undefined> {
  return runTest(
    {
      category: 'Payment Features',
      name: 'pay() function',
      requiresSDK: true,
      requiresUserInteraction: true,
    },
    async (ctx) => {
      const result = await ctx.loadedSDK.base.pay({
        amount: '0.01',
        to: '0x0000000000000000000000000000000000000001',
        testnet: false,
        walletUrl: ctx.walletUrl,
      });

      return result;
    },
    handlers,
    context
  );
}

/**
 * Test checking payment status with getPaymentStatus()
 */
export async function testGetPaymentStatus(
  handlers: TestHandlers,
  context: TestContext
): Promise<unknown> {
  // Check if payment ID is available
  if (!context.paymentId) {
    handlers.updateTestStatus(
      'Payment Features',
      'getPaymentStatus()',
      'skipped',
      'No payment ID available'
    );
    return undefined;
  }

  return runTest(
    {
      category: 'Payment Features',
      name: 'getPaymentStatus()',
      requiresSDK: true,
    },
    async (ctx) => {
      const status = await ctx.loadedSDK.getPaymentStatus({
        id: ctx.paymentId!,
        expectedPayment: {
          amount: '0.01',
          recipient: '0x0000000000000000000000000000000000000001',
        },
        testnet: false,
      });

      const details = [
        `Status: ${status.status}`,
        status.amount ? `Amount: ${status.amount} USDC` : null,
        status.recipient ? `Recipient: ${status.recipient}` : null,
        status.sender ? `Sender: ${status.sender}` : null,
        status.reason ? `Reason: ${status.reason}` : null,
      ]
        .filter(Boolean)
        .join(', ');

      return { status, details };
    },
    handlers,
    context
  );
}
