/**
 * Subscription Features Tests
 *
 * Tests for recurring payment functionality via base.subscribe() and
 * related subscription management methods.
 */

import type { TestContext, TestHandlers } from '../types';
import { runTest } from '../utils/test-helpers';

/**
 * Test creating a subscription with base.subscribe()
 */
export async function testSubscribe(
  handlers: TestHandlers,
  context: TestContext
): Promise<{ id: string } | undefined> {
  return runTest(
    {
      category: 'Subscription Features',
      name: 'subscribe() function',
      requiresSDK: true,
      requiresUserInteraction: true,
    },
    async (ctx) => {
      const result = await ctx.loadedSDK.base.subscribe({
        recurringCharge: '9.99',
        subscriptionOwner: '0x0000000000000000000000000000000000000001',
        periodInDays: 30,
        requireBalance: false,
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
 * Test checking subscription status with base.subscription.getStatus()
 */
export async function testGetSubscriptionStatus(
  handlers: TestHandlers,
  context: TestContext
): Promise<unknown> {
  // Check if subscription ID is available
  if (!context.subscriptionId) {
    handlers.updateTestStatus(
      'Subscription Features',
      'base.subscription.getStatus()',
      'skipped',
      'No subscription ID available'
    );
    return undefined;
  }

  return runTest(
    {
      category: 'Subscription Features',
      name: 'base.subscription.getStatus()',
      requiresSDK: true,
    },
    async (ctx) => {
      const status = await ctx.loadedSDK.base.subscription.getStatus({
        id: ctx.subscriptionId!,
        testnet: false,
      });

      const details = [
        `Active: ${status.isSubscribed}`,
        `Recurring: $${status.recurringCharge}`,
        status.remainingChargeInPeriod ? `Remaining: $${status.remainingChargeInPeriod}` : null,
        status.periodInDays ? `Period: ${status.periodInDays} days` : null,
      ]
        .filter(Boolean)
        .join(', ');

      return { status, details };
    },
    handlers,
    context
  );
}

/**
 * Test preparing charge data with base.subscription.prepareCharge()
 */
export async function testPrepareCharge(
  handlers: TestHandlers,
  context: TestContext
): Promise<void> {
  // Check if subscription ID is available
  if (!context.subscriptionId) {
    handlers.updateTestStatus(
      'Subscription Features',
      'prepareCharge() with amount',
      'skipped',
      'No subscription ID available'
    );
    handlers.updateTestStatus(
      'Subscription Features',
      'prepareCharge() max-remaining-charge',
      'skipped',
      'No subscription ID available'
    );
    return;
  }

  // Test with specific amount
  await runTest(
    {
      category: 'Subscription Features',
      name: 'prepareCharge() with amount',
      requiresSDK: true,
    },
    async (ctx) => {
      const chargeCalls = await ctx.loadedSDK.base.subscription.prepareCharge({
        id: ctx.subscriptionId!,
        amount: '1.00',
        testnet: false,
      });

      return chargeCalls;
    },
    handlers,
    context
  );

  // Test with max-remaining-charge
  await runTest(
    {
      category: 'Subscription Features',
      name: 'prepareCharge() max-remaining-charge',
      requiresSDK: true,
    },
    async (ctx) => {
      const maxChargeCalls = await ctx.loadedSDK.base.subscription.prepareCharge({
        id: ctx.subscriptionId!,
        amount: 'max-remaining-charge',
        testnet: false,
      });

      return maxChargeCalls;
    },
    handlers,
    context
  );
}
