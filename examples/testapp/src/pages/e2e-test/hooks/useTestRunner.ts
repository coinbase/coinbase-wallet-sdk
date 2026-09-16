/**
 * Hook for running E2E tests
 *
 * Encapsulates the test execution orchestration logic for both individual sections
 * and the full test suite. Uses the test registry to execute tests in sequence.
 */

import { useToast } from '@chakra-ui/react';
import { useCallback, useRef, type MutableRefObject } from 'react';
import { TEST_DELAYS } from '../../../utils/e2e-test-config/test-config';
import {
  TEST_INDICES,
  categoryRequiresConnection,
  getTestByIndex,
  getTestsByCategory,
  type TestFn,
} from '../tests';
import type { TestContext, TestHandlers } from '../types';
import { processTestResult } from './testResultHandlers';
import type { UseConnectionStateReturn } from './useConnectionState';
import type { UseTestStateReturn } from './useTestState';

// ============================================================================
// Types
// ============================================================================

export interface UseTestRunnerOptions {
  // State management
  testState: UseTestStateReturn;
  connectionState: UseConnectionStateReturn;

  // SDK state
  // biome-ignore lint/suspicious/noExplicitAny: LoadedSDK type varies between local and npm versions
  loadedSDK: any;
  // biome-ignore lint/suspicious/noExplicitAny: EIP1193Provider type from viem
  provider: any;

  // User interaction
  requestUserInteraction: (testName: string, skipModal?: boolean) => Promise<void>;

  // Test data refs
  paymentIdRef: MutableRefObject<string | null>;
  subscriptionIdRef: MutableRefObject<string | null>;
  permissionHashRef: MutableRefObject<string | null>;

  // Configuration
  walletUrl?: string;
}

export interface UseTestRunnerReturn {
  runAllTests: () => Promise<void>;
  runTestSection: (sectionName: string) => Promise<void>;
  runSCWReleaseTests: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTestRunner(options: UseTestRunnerOptions): UseTestRunnerReturn {
  const {
    testState,
    connectionState,
    loadedSDK,
    provider,
    requestUserInteraction,
    paymentIdRef,
    subscriptionIdRef,
    permissionHashRef,
    walletUrl,
  } = options;

  const toast = useToast();

  // Track whether we've shown the first modal for the current test run
  // The first modal should be skipped since the user's button click provides the gesture
  const hasShownFirstModalRef = useRef(false);

  /**
   * Build test context from current state
   */
  const buildTestContext = useCallback((): TestContext => {
    // Skip the first modal since the user's button click provides the gesture
    // After that, show modals for subsequent user interactions
    const skipModal = !hasShownFirstModalRef.current;

    return {
      provider,
      loadedSDK,
      connected: connectionState.connected,
      currentAccount: connectionState.currentAccount,
      chainId: connectionState.chainId,
      paymentId: paymentIdRef.current,
      subscriptionId: subscriptionIdRef.current,
      permissionHash: permissionHashRef.current,
      skipModal,
      walletUrl,
    };
  }, [
    provider,
    loadedSDK,
    connectionState.connected,
    connectionState.currentAccount,
    connectionState.chainId,
    paymentIdRef,
    subscriptionIdRef,
    permissionHashRef,
    walletUrl,
  ]);

  /**
   * Execute a single test function and capture return values to update refs
   */
  const executeTest = useCallback(
    async (testFn: TestFn): Promise<void> => {
      const context = buildTestContext();

      // Track which test ran by wrapping updateTestStatus
      let testCategory = '';
      let testName = '';
      let _requiresUserInteraction = false;

      const handlers: TestHandlers = {
        updateTestStatus: (category, name, status, error, details, duration) => {
          testCategory = category;
          testName = name;
          testState.updateTestStatus(category, name, status, error, details, duration);
        },
        requestUserInteraction: async (testName: string, skipModal?: boolean) => {
          _requiresUserInteraction = true;
          await requestUserInteraction(testName, skipModal);
          // After the first modal opportunity (whether shown or skipped),
          // mark that we've passed it so subsequent modals will be shown
          hasShownFirstModalRef.current = true;
        },
      };

      try {
        const result = await testFn(handlers, context);

        // Process test result using centralized handler
        if (result) {
          processTestResult({
            testCategory,
            testName,
            result,
            testState,
            connectionState,
            paymentIdRef,
            subscriptionIdRef,
            permissionHashRef,
          });
        }
      } catch (error) {
        // Test functions handle their own errors, but we catch here to prevent
        // uncaught promise rejections. If error is 'Test cancelled by user',
        // it will be re-thrown by the test function to stop execution.
        if (error instanceof Error && error.message === 'Test cancelled by user') {
          throw error;
        }
        // Other errors are already logged by the test function
      }
    },
    [
      buildTestContext,
      paymentIdRef,
      subscriptionIdRef,
      permissionHashRef,
      testState,
      connectionState,
      requestUserInteraction,
    ]
  );

  /**
   * Ensure wallet connection for tests that require it
   */
  const ensureConnectionForTests = useCallback(async (): Promise<void> => {
    if (!provider) {
      throw new Error('Provider not available');
    }

    // Check if already connected
    const accounts = await provider.request({
      method: 'eth_accounts',
      params: [],
    });

    if (accounts && accounts.length > 0) {
      connectionState.setCurrentAccount(accounts[0]);
      connectionState.setAllAccounts(accounts);
      connectionState.setConnected(true);
      return;
    }

    // Not connected - run wallet connection tests to establish connection
    const walletTests = getTestsByCategory('Wallet Connection');
    for (const testFn of walletTests) {
      await executeTest(testFn);
      await delay(TEST_DELAYS.BETWEEN_TESTS);
    }

    // Verify connection was established
    const accountsAfter = await provider.request({
      method: 'eth_accounts',
      params: [],
    });

    if (!accountsAfter || accountsAfter.length === 0) {
      throw new Error(
        'Failed to establish wallet connection after running connection tests. Please ensure wallet is available and user approves connection.'
      );
    }

    // Update connection state with verified connection
    connectionState.setCurrentAccount(accountsAfter[0]);
    connectionState.setAllAccounts(accountsAfter);
    connectionState.setConnected(true);
  }, [provider, connectionState, executeTest]);

  /**
   * Run a specific test section
   */
  const runTestSection = useCallback(
    async (sectionName: string): Promise<void> => {
      testState.setRunningSectionName(sectionName);
      testState.resetCategory(sectionName);

      // Reset modal tracking for this test run
      // The first modal will be skipped since the button click provides the gesture
      hasShownFirstModalRef.current = false;

      try {
        // Check if section requires connection
        if (categoryRequiresConnection(sectionName)) {
          await ensureConnectionForTests();
          await delay(TEST_DELAYS.BETWEEN_TESTS);
        }

        // Get tests for this section
        const tests = getTestsByCategory(sectionName);

        if (tests.length === 0) {
          return;
        }

        // Execute tests in sequence
        for (let i = 0; i < tests.length; i++) {
          await executeTest(tests[i]);

          // Add delay between tests (except after last test)
          if (i < tests.length - 1) {
            await delay(TEST_DELAYS.BETWEEN_TESTS);
          }
        }

        toast({
          title: 'Section Complete',
          description: `${sectionName} tests finished`,
          status: 'success',
          duration: TEST_DELAYS.TOAST_SUCCESS_DURATION,
          isClosable: true,
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Test cancelled by user') {
          toast({
            title: 'Tests Cancelled',
            description: `${sectionName} tests were cancelled`,
            status: 'warning',
            duration: TEST_DELAYS.TOAST_WARNING_DURATION,
            isClosable: true,
          });
        }
      } finally {
        testState.setRunningSectionName(null);
      }
    },
    [testState, toast, ensureConnectionForTests, executeTest]
  );

  /**
   * Helper to run all tests in a category
   */
  const runTestCategory = useCallback(
    async (categoryName: string): Promise<void> => {
      const tests = getTestsByCategory(categoryName);

      for (let i = 0; i < tests.length; i++) {
        await executeTest(tests[i]);

        // Add delay between tests (except after last test)
        if (i < tests.length - 1) {
          await delay(TEST_DELAYS.BETWEEN_TESTS);
        }
      }
    },
    [executeTest]
  );

  /**
   * Run all tests in the complete test suite
   */
  const runAllTests = useCallback(async (): Promise<void> => {
    testState.startTests();
    testState.resetAllCategories();

    // Reset modal tracking for this test run
    // The first modal will be skipped since the button click provides the gesture
    hasShownFirstModalRef.current = false;

    try {
      // Execute tests following the optimized sequence from the original implementation
      // This sequence is designed to minimize flakiness and ensure proper test dependencies

      // 1. SDK Initialization (must be first)
      await runTestCategory('SDK Initialization & Exports');
      await delay(TEST_DELAYS.BETWEEN_TESTS);

      // 2. Establish wallet connection
      await runTestCategory('Wallet Connection');
      await delay(TEST_DELAYS.BETWEEN_TESTS);

      // 3. Run connection-dependent tests BEFORE pay/subscribe
      // These need a stable connection state

      // Sign & Send tests
      await runTestCategory('Sign & Send');
      await delay(TEST_DELAYS.BETWEEN_TESTS);

      // Spend Permission tests
      await runTestCategory('Spend Permissions');
      await delay(TEST_DELAYS.BETWEEN_TESTS);
      await runTestCategory('Sub-Account Features');
      await delay(TEST_DELAYS.BETWEEN_TESTS);

      // 5. Payment & Subscription tests (run AFTER sub-account tests)
      await runTestCategory('Payment Features');
      await delay(TEST_DELAYS.BETWEEN_TESTS);

      await runTestCategory('Subscription Features');
      await delay(TEST_DELAYS.BETWEEN_TESTS);

      // 6. Standalone tests (don't require connection)
      await runTestCategory('Prolink Features');
      await delay(TEST_DELAYS.BETWEEN_TESTS);

      await runTestCategory('Provider Events');
      await delay(TEST_DELAYS.BETWEEN_TESTS);
    } catch (error) {
      if (error instanceof Error && error.message === 'Test cancelled by user') {
        toast({
          title: 'Tests Cancelled',
          description: 'Test suite was cancelled by user',
          status: 'warning',
          duration: TEST_DELAYS.TOAST_WARNING_DURATION,
          isClosable: true,
        });
      }
    } finally {
      testState.stopTests();

      // Show completion toast (if not cancelled)
      const passed = testState.testCategories.reduce(
        (acc, cat) => acc + cat.tests.filter((t) => t.status === 'passed').length,
        0
      );
      const failed = testState.testCategories.reduce(
        (acc, cat) => acc + cat.tests.filter((t) => t.status === 'failed').length,
        0
      );

      if (passed > 0 || failed > 0) {
        toast({
          title: 'Tests Complete',
          description: `${passed} passed, ${failed} failed`,
          status: failed > 0 ? 'warning' : 'success',
          duration: TEST_DELAYS.TOAST_INFO_DURATION,
          isClosable: true,
        });
      }
    }
  }, [testState, toast, runTestCategory]);

  /**
   * Run only tests that make external requests (require user interaction)
   * This is useful for SCW Release testing
   *
   * The following tests are included (tests that open popups/windows and receive responses):
   * 1. Wallet Connection:
   *    - testConnectWallet (opens popup)
   *    - testGetAccounts
   *    - testGetChainId
   *    - testSignMessage (opens popup)
   * 2. Sign & Send:
   *    - testSignTypedData (opens popup)
   *    - testWalletSendCalls (opens popup)
   * 3. Spend Permissions:
   *    - testRequestSpendPermission (opens popup)
   *    - testGetPermissionStatus
   *    - testFetchPermission
   *    - testFetchPermissions
   * 5. Payment Features:
   *    - testPay (opens popup)
   *    - testGetPaymentStatus
   * 6. Subscription Features:
   *    - testSubscribe (opens popup)
   *    - testGetSubscriptionStatus
   *
   * Tests excluded (no external requests or not relevant for SCW Release):
   * - SDK Initialization & Exports (SDK already instantiated on page load)
   * - wallet_prepareCalls (no popup)
   * - personal_sign (sub-account) (no popup)
   * - prepareSpendCallData (no popup)
   * - prepareRevokeCallData (no popup)
   * - prepareCharge variants (no popup)
   * - Prolink Features (all tests - no external requests)
   * - Provider Events (all tests - no external requests)
   */
  const runSCWReleaseTests = useCallback(async (): Promise<void> => {
    testState.startTests();
    testState.resetAllCategories();

    // Reset modal tracking for this test run
    hasShownFirstModalRef.current = false;

    try {
      // Execute tests that make external requests following the optimized sequence
      // Note: SDK Initialization tests are skipped - SDK is already loaded on page load

      // Helper to safely execute a test by index
      const executeTestByIndex = async (categoryName: string, index: number) => {
        const test = getTestByIndex(categoryName, index);
        if (test) {
          await executeTest(test);
          await delay(TEST_DELAYS.BETWEEN_TESTS);
        } else {
          console.warn(`[SCW Release Tests] Test not found: ${categoryName}[${index}]`);
        }
      };

      // 1. Establish wallet connection - testConnectWallet requires user interaction
      await executeTestByIndex('Wallet Connection', TEST_INDICES.WALLET_CONNECTION.CONNECT_WALLET);

      // Get remaining wallet connection tests (testGetAccounts, testGetChainId don't need user interaction)
      await executeTestByIndex('Wallet Connection', TEST_INDICES.WALLET_CONNECTION.GET_ACCOUNTS);
      await executeTestByIndex('Wallet Connection', TEST_INDICES.WALLET_CONNECTION.GET_CHAIN_ID);

      // testSignMessage requires user interaction
      await executeTestByIndex('Wallet Connection', TEST_INDICES.WALLET_CONNECTION.SIGN_MESSAGE);

      // 2. Sign & Send tests - testSignTypedData and testWalletSendCalls require user interaction
      await executeTestByIndex('Sign & Send', TEST_INDICES.SIGN_AND_SEND.SIGN_TYPED_DATA);
      await executeTestByIndex('Sign & Send', TEST_INDICES.SIGN_AND_SEND.WALLET_SEND_CALLS);
      // testWalletPrepareCalls doesn't require user interaction - skip

      // 3. Spend Permission tests - testRequestSpendPermission requires user interaction
      await executeTestByIndex(
        'Spend Permissions',
        TEST_INDICES.SPEND_PERMISSIONS.REQUEST_SPEND_PERMISSION
      );
      // testGetPermissionStatus, testFetchPermission don't require user interaction - skip
      // testFetchPermissions doesn't require user interaction
      await executeTestByIndex(
        'Spend Permissions',
        TEST_INDICES.SPEND_PERMISSIONS.FETCH_PERMISSIONS
      );
      // testPrepareSpendCallData and testPrepareRevokeCallData don't require user interaction - skip
      await executeTestByIndex(
        'Sub-Account Features',
        TEST_INDICES.SUB_ACCOUNT_FEATURES.CREATE_SUB_ACCOUNT
      );
      await executeTestByIndex(
        'Sub-Account Features',
        TEST_INDICES.SUB_ACCOUNT_FEATURES.GET_SUB_ACCOUNTS
      );
      await executeTestByIndex(
        'Sub-Account Features',
        TEST_INDICES.SUB_ACCOUNT_FEATURES.SEND_CALLS_FROM_SUB_ACCOUNT
      );

      // 5. Payment tests - testPay requires user interaction
      await executeTestByIndex('Payment Features', TEST_INDICES.PAYMENT_FEATURES.PAY);
      await executeTestByIndex(
        'Payment Features',
        TEST_INDICES.PAYMENT_FEATURES.GET_PAYMENT_STATUS
      );

      // 6. Subscription tests - testSubscribe requires user interaction
      await executeTestByIndex(
        'Subscription Features',
        TEST_INDICES.SUBSCRIPTION_FEATURES.SUBSCRIBE
      );
      // testGetSubscriptionStatus doesn't require user interaction - skip
      // testPrepareCharge doesn't require user interaction - skip
    } catch (error) {
      if (error instanceof Error && error.message === 'Test cancelled by user') {
        toast({
          title: 'Tests Cancelled',
          description: 'SCW Release test suite was cancelled by user',
          status: 'warning',
          duration: TEST_DELAYS.TOAST_WARNING_DURATION,
          isClosable: true,
        });
      }
    } finally {
      testState.stopTests();

      // Show completion toast
      const passed = testState.testCategories.reduce(
        (acc, cat) => acc + cat.tests.filter((t) => t.status === 'passed').length,
        0
      );
      const failed = testState.testCategories.reduce(
        (acc, cat) => acc + cat.tests.filter((t) => t.status === 'failed').length,
        0
      );

      if (passed > 0 || failed > 0) {
        toast({
          title: 'SCW Release Tests Complete',
          description: `${passed} passed, ${failed} failed`,
          status: failed > 0 ? 'warning' : 'success',
          duration: TEST_DELAYS.TOAST_INFO_DURATION,
          isClosable: true,
        });
      }
    }
  }, [testState, toast, executeTest]);

  return {
    runAllTests,
    runTestSection,
    runSCWReleaseTests,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Delay helper for test sequencing
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
