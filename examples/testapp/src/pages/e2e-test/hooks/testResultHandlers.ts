/**
 * Test Result Handlers Configuration
 *
 * Centralized mapping of test names to their result processing logic.
 * Each handler is responsible for:
 * - Extracting relevant data from test results
 * - Updating refs (e.g., paymentId, subscriptionId)
 * - Updating test status with meaningful details
 * - Updating connection state when needed
 */

import type { MutableRefObject } from 'react';
import type { UseConnectionStateReturn } from './useConnectionState';
import type { UseTestStateReturn } from './useTestState';

// ============================================================================
// Types
// ============================================================================

/**
 * Context passed to each test result handler
 */
export interface TestResultHandlerContext {
  testCategory: string;
  testName: string;
  // biome-ignore lint/suspicious/noExplicitAny: Result type varies, runtime checks in handlers
  result: any;
  testState: UseTestStateReturn;
  connectionState: UseConnectionStateReturn;
  paymentIdRef: MutableRefObject<string | null>;
  subscriptionIdRef: MutableRefObject<string | null>;
  permissionHashRef: MutableRefObject<string | null>;
}

/**
 * Handler function for processing test results
 */
export type TestResultHandler = (ctx: TestResultHandlerContext) => void;

// ============================================================================
// Handler Configuration
// ============================================================================

/**
 * Centralized configuration for handling test results.
 * Each test name maps to a handler that processes the result and updates state/refs/details.
 */
export const TEST_RESULT_HANDLERS: Record<string, TestResultHandler> = {
  // Payment features
  'pay() function': (ctx) => {
    if (ctx.result.id) {
      ctx.paymentIdRef.current = ctx.result.id;
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Payment ID: ${ctx.result.id}`
      );
    }
  },

  // Subscription features
  'subscribe() function': (ctx) => {
    if (ctx.result.id) {
      ctx.subscriptionIdRef.current = ctx.result.id;
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Subscription ID: ${ctx.result.id}`
      );
    }
  },
  'base.subscription.getStatus()': (ctx) => {
    if (ctx.result.details) {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        ctx.result.details
      );
    }
  },
  'prepareCharge() with amount': (ctx) => {
    if (Array.isArray(ctx.result)) {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Generated ${ctx.result.length} call(s)`
      );
    }
  },
  'prepareCharge() max-remaining-charge': (ctx) => {
    if (Array.isArray(ctx.result)) {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Generated ${ctx.result.length} call(s)`
      );
    }
  },

  // Sub-account features
  'wallet_sendCalls (sub-account)': (ctx) => {
    // Handle both direct string result and object with txHash property
    const hash = typeof ctx.result === 'string' ? ctx.result : ctx.result?.txHash;
    if (hash) {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Tx: ${hash}`
      );
    }
  },
  'personal_sign (sub-account)': (ctx) => {
    if (ctx.result.isValid !== undefined) {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Verified: ${ctx.result.isValid}`
      );
    }
  },

  // Spend permission features
  'spendPermission.requestSpendPermission()': (ctx) => {
    if (ctx.result.permissionHash) {
      ctx.permissionHashRef.current = ctx.result.permissionHash;
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Hash: ${ctx.result.permissionHash}`
      );
    }
  },
  'spendPermission.getPermissionStatus()': (ctx) => {
    if (ctx.result.remainingSpend) {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Remaining: ${ctx.result.remainingSpend}`
      );
    }
  },
  'spendPermission.fetchPermission()': (ctx) => {
    if (ctx.result.permissionHash) {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Hash: ${ctx.result.permissionHash}`
      );
    }
  },
  'spendPermission.fetchPermissions()': (ctx) => {
    if (Array.isArray(ctx.result)) {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Found ${ctx.result.length} permission(s)`
      );
    }
  },
  'spendPermission.prepareSpendCallData()': (ctx) => {
    if (Array.isArray(ctx.result)) {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Generated ${ctx.result.length} call(s)`
      );
    }
  },
  'spendPermission.prepareRevokeCallData()': (ctx) => {
    if (ctx.result.to) {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `To: ${ctx.result.to}`
      );
    }
  },

  // Wallet connection
  'Connect wallet': (ctx) => {
    if (Array.isArray(ctx.result) && ctx.result.length > 0) {
      ctx.connectionState.setCurrentAccount(ctx.result[0]);
      ctx.connectionState.setAllAccounts(ctx.result);
      ctx.connectionState.setConnected(true);
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Connected: ${ctx.result[0]}`
      );
    }
  },
  'Get accounts': (ctx) => {
    if (Array.isArray(ctx.result)) {
      if (ctx.result.length > 0 && !ctx.connectionState.connected) {
        ctx.connectionState.setCurrentAccount(ctx.result[0]);
        ctx.connectionState.setAllAccounts(ctx.result);
        ctx.connectionState.setConnected(true);
      } else if (ctx.result.length > 0) {
        // Update accounts even if already connected
        ctx.connectionState.setAllAccounts(ctx.result);
      }
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        ctx.result.join(', ')
      );
    }
  },
  'Get chain ID': (ctx) => {
    if (typeof ctx.result === 'number') {
      ctx.connectionState.setChainId(ctx.result);
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Chain ID: ${ctx.result}`
      );
    }
  },
  'Sign message (personal_sign)': (ctx) => {
    if (typeof ctx.result === 'string') {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Sig: ${ctx.result}`
      );
    }
  },

  // Sign & Send
  eth_signTypedData_v4: (ctx) => {
    if (typeof ctx.result === 'string') {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Sig: ${ctx.result}`
      );
    }
  },
  wallet_sendCalls: (ctx) => {
    let hash: string | undefined;
    if (typeof ctx.result === 'string') {
      hash = ctx.result;
    } else if (typeof ctx.result === 'object' && ctx.result !== null && 'id' in ctx.result) {
      hash = ctx.result.id;
    }
    if (hash) {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Hash: ${hash}`
      );
    }
  },

  // Prolink features
  'encodeProlink()': (ctx) => {
    if (typeof ctx.result === 'string') {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `Encoded: ${ctx.result}`
      );
    }
  },
  'createProlinkUrl()': (ctx) => {
    if (typeof ctx.result === 'string') {
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `URL: ${ctx.result}`
      );
    }
  },
};

// ============================================================================
// Processing Function
// ============================================================================

/**
 * Process test result using the configured handler.
 * If no handler exists for the test name, this is a no-op.
 * Errors in handlers are caught and logged to prevent test suite crashes.
 */
export function processTestResult(ctx: TestResultHandlerContext): void {
  const handler = TEST_RESULT_HANDLERS[ctx.testName];
  if (handler) {
    try {
      handler(ctx);
    } catch (error) {
      console.error(`[Test Result Handler] Error processing result for "${ctx.testName}":`, error);
      // Update test status to reflect handler error, but keep the test as passed
      // since the actual test execution succeeded
      const currentDetails = ctx.testState.testCategories
        .find((cat) => cat.name === ctx.testCategory)
        ?.tests.find((t) => t.name === ctx.testName)?.details;
      ctx.testState.updateTestStatus(
        ctx.testCategory,
        ctx.testName,
        'passed',
        undefined,
        `${currentDetails || 'Success'} (Note: Result handler error - check console)`
      );
    }
  }
}
