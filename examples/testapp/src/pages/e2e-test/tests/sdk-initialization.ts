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
      });

      // Update provider in context (this is a side effect but necessary for subsequent tests)
      // Published versions expose `getProvider()`; the local build groups it under `evm`.
      const provider = sdkInstance.evm?.getProvider() ?? sdkInstance.getProvider();

      return { sdkInstance, provider };
    },
    handlers,
    context
  );

  // Test core exports (these don't need runTest wrapper as they're synchronous checks)
  const coreExports = [
    { name: 'createCoinbaseWalletSDK', value: context.loadedSDK.createCoinbaseWalletSDK },
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
}
