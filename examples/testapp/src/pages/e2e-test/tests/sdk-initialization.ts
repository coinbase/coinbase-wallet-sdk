/**
 * SDK Initialization & Exports Tests
 *
 * Tests that verify the SDK can be properly initialized and all expected
 * functions are exported.
 */

import type { TestContext, TestHandlers } from '../types';
import { runTest } from '../utils/test-helpers';

/**
 * Test SDK initialization and verify all core exports are available
 */
export async function testSDKInitialization(
  handlers: TestHandlers,
  context: TestContext
): Promise<void> {
  const category = 'SDK Initialization & Exports';

  // Test SDK can be initialized
  await runTest(
    {
      category,
      name: 'SDK can be initialized',
      requiresSDK: true,
    },
    async (ctx) => {
      const sdkInstance = ctx.loadedSDK.createCoinbaseWalletSDK({
        appName: 'E2E Test Suite',
        appLogoUrl: undefined,
        appChainIds: [8453], // Base mainnet
      });

      // Update provider in context (this is a side effect but necessary for subsequent tests)
      const provider = sdkInstance.getProvider();

      return { sdkInstance, provider };
    },
    handlers,
    context
  );

  // Test core exports (these don't need runTest wrapper as they're synchronous checks)
  const coreExports = [
    { name: 'createCoinbaseWalletSDK', value: context.loadedSDK.createCoinbaseWalletSDK },
    { name: 'base.pay', value: context.loadedSDK.base?.pay },
    { name: 'base.subscribe', value: context.loadedSDK.base?.subscribe },
    { name: 'base.subscription.getStatus', value: context.loadedSDK.base?.subscription?.getStatus },
    {
      name: 'base.subscription.prepareCharge',
      value: context.loadedSDK.base?.subscription?.prepareCharge,
    },
    { name: 'getPaymentStatus', value: context.loadedSDK.getPaymentStatus },
    { name: 'TOKENS', value: context.loadedSDK.TOKENS },
    { name: 'CHAIN_IDS', value: context.loadedSDK.CHAIN_IDS },
    { name: 'VERSION', value: context.loadedSDK.VERSION },
  ];

  for (const exp of coreExports) {
    handlers.updateTestStatus(category, `${exp.name} is exported`, 'running');
    if (exp.value !== undefined && exp.value !== null) {
      handlers.updateTestStatus(category, `${exp.name} is exported`, 'passed');
    } else {
      handlers.updateTestStatus(
        category,
        `${exp.name} is exported`,
        'failed',
        `${exp.name} is undefined`
      );
    }
  }

  // Test optional exports (only available in local SDK, not npm CDN)
  const optionalExports = [
    { name: 'encodeProlink', value: context.loadedSDK.encodeProlink },
    { name: 'decodeProlink', value: context.loadedSDK.decodeProlink },
    { name: 'createProlinkUrl', value: context.loadedSDK.createProlinkUrl },
    {
      name: 'spendPermission.requestSpendPermission',
      value: context.loadedSDK.spendPermission?.requestSpendPermission,
    },
    {
      name: 'spendPermission.fetchPermissions',
      value: context.loadedSDK.spendPermission?.fetchPermissions,
    },
  ];

  for (const exp of optionalExports) {
    handlers.updateTestStatus(category, `${exp.name} is exported`, 'running');
    if (exp.value !== undefined && exp.value !== null) {
      handlers.updateTestStatus(
        category,
        `${exp.name} is exported`,
        'passed',
        undefined,
        'Available'
      );
    } else {
      handlers.updateTestStatus(
        category,
        `${exp.name} is exported`,
        'skipped',
        'Not available (local SDK only)'
      );
    }
  }
}
