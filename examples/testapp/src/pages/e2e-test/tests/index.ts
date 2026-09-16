/**
 * Test Registry
 *
 * Central registry of all E2E tests organized by category.
 * This provides a structured way to access and run tests.
 */

import type { TestContext, TestHandlers } from '../types';

import { testGetPaymentStatus, testPay } from './payment-features';
import { testProlinkEncodeDecode } from './prolink-features';
import { testProviderEvents } from './provider-events';
// Import all test functions
import { testSDKInitialization } from './sdk-initialization';
import { testSignTypedData, testWalletPrepareCalls, testWalletSendCalls } from './sign-and-send';
import {
  testFetchPermission,
  testFetchPermissions,
  testGetPermissionStatus,
  testPrepareRevokeCallData,
  testPrepareSpendCallData,
  testRequestSpendPermission,
} from './spend-permissions';
import {
  testGetSubscriptionStatus,
  testPrepareCharge,
  testSubscribe,
} from './subscription-features';
import {
  testConnectWallet,
  testGetAccounts,
  testGetChainId,
  testSignMessage,
} from './wallet-connection';

/**
 * Test function type
 */
export type TestFn = (handlers: TestHandlers, context: TestContext) => Promise<unknown>;

/**
 * Test category definition
 */
export interface TestCategoryDefinition {
  name: string;
  tests: TestFn[];
  requiresConnection?: boolean; // Category-level requirement
}

/**
 * Complete test registry organized by category
 */
export const testRegistry: TestCategoryDefinition[] = [
  {
    name: 'SDK Initialization & Exports',
    tests: [testSDKInitialization],
    requiresConnection: false,
  },
  {
    name: 'Wallet Connection',
    tests: [testConnectWallet, testGetAccounts, testGetChainId, testSignMessage],
    requiresConnection: false, // Connection is established during these tests
  },
  {
    name: 'Payment Features',
    tests: [testPay, testGetPaymentStatus],
    requiresConnection: false, // pay() doesn't require explicit connection
  },
  {
    name: 'Subscription Features',
    tests: [testSubscribe, testGetSubscriptionStatus, testPrepareCharge],
    requiresConnection: false, // subscribe() doesn't require explicit connection
  },
  {
    name: 'Prolink Features',
    tests: [testProlinkEncodeDecode],
    requiresConnection: false,
  },
  {
    name: 'Spend Permissions',
    tests: [
      testRequestSpendPermission,
      testGetPermissionStatus,
      testFetchPermission,
      testFetchPermissions,
      testPrepareSpendCallData,
      testPrepareRevokeCallData,
    ],
    requiresConnection: true,
  },
  {
    name: 'Sub-Account Features',
    tests: [],
    requiresConnection: true,
  },
  {
    name: 'Sign & Send',
    tests: [testSignTypedData, testWalletSendCalls, testWalletPrepareCalls],
    requiresConnection: true,
  },
  {
    name: 'Provider Events',
    tests: [testProviderEvents],
    requiresConnection: false,
  },
];

/**
 * Get all test functions in a flat array
 */
export function getAllTests(): TestFn[] {
  return testRegistry.flatMap((category) => category.tests);
}

/**
 * Get tests for a specific category by name
 */
export function getTestsByCategory(categoryName: string): TestFn[] {
  const category = testRegistry.find((cat) => cat.name === categoryName);
  return category?.tests || [];
}

/**
 * Get all category names
 */
export function getCategoryNames(): string[] {
  return testRegistry.map((cat) => cat.name);
}

/**
 * Check if a category requires connection
 */
export function categoryRequiresConnection(categoryName: string): boolean {
  const category = testRegistry.find((cat) => cat.name === categoryName);
  return category?.requiresConnection || false;
}

/**
 * Get a specific test by category and index with validation
 * This is safer than directly accessing array indices
 *
 * @param categoryName - Name of the category
 * @param index - Index of the test in the category
 * @returns The test function, or undefined if not found
 *
 * @example
 * ```typescript
 * const connectTest = getTestByIndex('Wallet Connection', 0); // testConnectWallet
 * ```
 */
export function getTestByIndex(categoryName: string, index: number): TestFn | undefined {
  const tests = getTestsByCategory(categoryName);
  if (index < 0 || index >= tests.length) {
    console.warn(
      `[Test Registry] Test index ${index} out of bounds for category "${categoryName}" (has ${tests.length} tests)`
    );
    return undefined;
  }
  return tests[index];
}

/**
 * Test index constants for runSCWReleaseTests
 * These constants make the test indices more explicit and easier to maintain
 */
export const TEST_INDICES = {
  WALLET_CONNECTION: {
    CONNECT_WALLET: 0,
    GET_ACCOUNTS: 1,
    GET_CHAIN_ID: 2,
    SIGN_MESSAGE: 3,
  },
  SIGN_AND_SEND: {
    SIGN_TYPED_DATA: 0,
    WALLET_SEND_CALLS: 1,
  },
  SPEND_PERMISSIONS: {
    REQUEST_SPEND_PERMISSION: 0,
    FETCH_PERMISSIONS: 3,
  },
  SUB_ACCOUNT_FEATURES: {
    CREATE_SUB_ACCOUNT: 0,
    GET_SUB_ACCOUNTS: 1,
    SEND_CALLS_FROM_SUB_ACCOUNT: 3,
  },
  PAYMENT_FEATURES: {
    PAY: 0,
    GET_PAYMENT_STATUS: 1,
  },
  SUBSCRIPTION_FEATURES: {
    SUBSCRIBE: 0,
  },
} as const;

// Export all test functions for direct use
export { testSDKInitialization } from './sdk-initialization';
export {
  testConnectWallet,
  testGetAccounts,
  testGetChainId,
  testSignMessage,
} from './wallet-connection';
export {
  testPay,
  testGetPaymentStatus,
} from './payment-features';
export {
  testSubscribe,
  testPrepareCharge,
} from './subscription-features';
export {
  testRequestSpendPermission,
  testGetPermissionStatus,
  testFetchPermission,
  testFetchPermissions,
  testPrepareSpendCallData,
  testPrepareRevokeCallData,
} from './spend-permissions';
export {
  testSignTypedData,
  testWalletSendCalls,
  testWalletPrepareCalls,
} from './sign-and-send';
export { testProlinkEncodeDecode } from './prolink-features';
export { testProviderEvents } from './provider-events';
