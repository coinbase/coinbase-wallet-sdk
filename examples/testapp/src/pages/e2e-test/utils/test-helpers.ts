/**
 * Test helper utilities for E2E test suite
 *
 * This module provides the core `runTest` function that wraps test execution
 * with consistent error handling, status updates, and logging.
 */

import type { TestConfig, TestContext, TestFunction, TestHandlers, TestStatus } from '../types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Default timeout for test execution (30 seconds)
 */
const DEFAULT_TEST_TIMEOUT_MS = 30000;

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Custom error class for test cancellation
 */
export class TestCancelledError extends Error {
  constructor() {
    super('Test cancelled by user');
    this.name = 'TestCancelledError';
  }
}

/**
 * Custom error class for test timeout
 */
export class TestTimeoutError extends Error {
  constructor(testName: string, timeoutMs: number) {
    super(`Test "${testName}" timed out after ${timeoutMs}ms`);
    this.name = 'TestTimeoutError';
  }
}

/**
 * Check if an error is a test cancellation
 */
export function isTestCancelled(error: unknown): boolean {
  return (
    error instanceof TestCancelledError ||
    (error instanceof Error && error.message === 'Test cancelled by user')
  );
}

/**
 * Format an error for display
 */
export function formatTestError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

/**
 * Wrap a promise with a timeout
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param testName - Name of the test (for error message)
 * @returns Promise that rejects if timeout is reached
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  testName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TestTimeoutError(testName, timeoutMs));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Validate test prerequisites
 *
 * Note: Connection status is NOT checked here because it's checked later
 * with a live provider query in the main runTest function. This ensures
 * we always use the most up-to-date connection status.
 */
function validatePrerequisites(config: TestConfig, context: TestContext): string | null {
  const { requiresProvider, requiresSDK } = config;

  if (requiresProvider && !context.provider) {
    return 'Provider not available';
  }

  if (requiresSDK && !context.loadedSDK) {
    return 'SDK not loaded';
  }

  // Connection check is done later with getCurrentAccount() for accuracy
  return null;
}

/**
 * Get current account from provider
 */
async function getCurrentAccount(context: TestContext): Promise<string | null> {
  if (!context.provider) {
    return null;
  }

  try {
    const accounts = (await context.provider.request({
      method: 'eth_accounts',
      params: [],
    })) as string[];

    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch {
    return null;
  }
}

/**
 * Core test runner that wraps test execution with consistent error handling,
 * status updates, and logging.
 *
 * This function eliminates ~500 lines of duplicated try-catch-logging-status code
 * across all test functions.
 *
 * @param config - Test configuration (name, category, requirements)
 * @param testFn - The actual test function to execute
 * @param handlers - Handlers for status updates and logging
 * @param context - Test context (provider, SDK, connection state, etc.)
 * @returns The test result or undefined if skipped/failed
 *
 * @example
 * ```typescript
 * await runTest(
 *   {
 *     category: 'Wallet Connection',
 *     name: 'Sign message',
 *     requiresConnection: true,
 *     requiresUserInteraction: true,
 *   },
 *   async (ctx) => {
 *     const accounts = await ctx.provider.request({ method: 'eth_accounts', params: [] });
 *     const message = 'Hello from E2E test!';
 *     return await ctx.provider.request({
 *       method: 'personal_sign',
 *       params: [message, accounts[0]],
 *     });
 *   },
 *   handlers,
 *   context
 * );
 * ```
 */
export async function runTest<T>(
  config: TestConfig,
  testFn: TestFunction<T>,
  handlers: TestHandlers,
  context: TestContext
): Promise<T | undefined> {
  const { category, name, requiresUserInteraction } = config;
  const { updateTestStatus, requestUserInteraction } = handlers;

  try {
    // Mark test as running
    updateTestStatus(category, name, 'running');

    // Validate prerequisites
    const prerequisiteError = validatePrerequisites(config, context);
    if (prerequisiteError) {
      updateTestStatus(category, name, 'skipped', prerequisiteError);
      return undefined;
    }

    // Check connection status for connection-required tests
    if (config.requiresConnection) {
      const account = await getCurrentAccount(context);
      if (!account) {
        updateTestStatus(category, name, 'skipped', 'Not connected');
        return undefined;
      }
    }

    // Request user interaction if needed
    if (requiresUserInteraction && requestUserInteraction) {
      await requestUserInteraction(name, context.skipModal);
    }

    // Execute the test with timeout protection
    const startTime = Date.now();
    const result = await withTimeout(testFn(context), DEFAULT_TEST_TIMEOUT_MS, name);
    const duration = Date.now() - startTime;

    // Mark test as passed
    updateTestStatus(category, name, 'passed', undefined, undefined, duration);

    return result;
  } catch (error) {
    // Handle test timeout
    if (error instanceof TestTimeoutError) {
      updateTestStatus(category, name, 'failed', error.message);
      return undefined;
    }

    // Handle test cancellation
    if (isTestCancelled(error)) {
      updateTestStatus(category, name, 'skipped', 'Cancelled by user');
      throw error; // Re-throw to stop test suite
    }

    // Handle other errors
    const errorMessage = formatTestError(error);
    updateTestStatus(category, name, 'failed', errorMessage);

    return undefined;
  }
}

/**
 * Run multiple tests in sequence with delays between them
 *
 * @param tests - Array of test functions to run
 * @param delayMs - Delay in milliseconds between tests (default: 500)
 */
export async function runTestSequence(
  tests: Array<() => Promise<void>>,
  delayMs = 500
): Promise<void> {
  for (let i = 0; i < tests.length; i++) {
    await tests[i]();

    // Add delay between tests (but not after the last one)
    if (i < tests.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Create a test function wrapper that provides simplified test context
 *
 * This is useful for tests that need to be called multiple times or
 * need access to shared test data (like paymentId, subscriptionId, etc.)
 */
export function createTestWrapper(
  config: TestConfig,
  handlers: TestHandlers,
  context: TestContext
) {
  return async <T>(testFn: TestFunction<T>): Promise<T | undefined> => {
    return runTest(config, testFn, handlers, context);
  };
}

/**
 * Helper to update test result details after a test has completed
 *
 * Useful for adding additional information after the test finishes
 */
export function updateTestDetails(
  handlers: TestHandlers,
  category: string,
  name: string,
  status: TestStatus,
  details: string
): void {
  handlers.updateTestStatus(category, name, status, undefined, details);
}
