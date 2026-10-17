/**
 * Provider Events Tests
 *
 * Tests for provider event listeners (accountsChanged, chainChanged, disconnect).
 */

import type { TestContext, TestHandlers } from '../types';
import { runTest } from '../utils/test-helpers';

/**
 * Test all provider event listeners
 */
export async function testProviderEvents(
  handlers: TestHandlers,
  context: TestContext
): Promise<void> {
  const category = 'Provider Events';

  if (!context.provider) {
    handlers.updateTestStatus(
      category,
      'accountsChanged listener',
      'skipped',
      'Provider not available'
    );
    handlers.updateTestStatus(
      category,
      'chainChanged listener',
      'skipped',
      'Provider not available'
    );
    handlers.updateTestStatus(category, 'disconnect listener', 'skipped', 'Provider not available');
    return;
  }

  // Test accountsChanged listener
  await runTest(
    {
      category,
      name: 'accountsChanged listener',
      requiresProvider: true,
    },
    async (ctx) => {
      let _accountsChangedFired = false;
      const accountsChangedHandler = () => {
        _accountsChangedFired = true;
      };

      ctx.provider.on('accountsChanged', accountsChangedHandler);

      // Clean up listener
      ctx.provider.removeListener('accountsChanged', accountsChangedHandler);

      return true;
    },
    handlers,
    context
  );

  // Test chainChanged listener
  await runTest(
    {
      category,
      name: 'chainChanged listener',
      requiresProvider: true,
    },
    async (ctx) => {
      const chainChangedHandler = () => {};
      ctx.provider.on('chainChanged', chainChangedHandler);
      ctx.provider.removeListener('chainChanged', chainChangedHandler);

      return true;
    },
    handlers,
    context
  );

  // Test disconnect listener
  await runTest(
    {
      category,
      name: 'disconnect listener',
      requiresProvider: true,
    },
    async (ctx) => {
      const disconnectHandler = () => {};
      ctx.provider.on('disconnect', disconnectHandler);
      ctx.provider.removeListener('disconnect', disconnectHandler);

      return true;
    },
    handlers,
    context
  );
}
