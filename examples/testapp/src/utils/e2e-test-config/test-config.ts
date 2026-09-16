/**
 * Centralized test configuration and constants
 *
 * This file consolidates all hardcoded values, test addresses, chain configurations,
 * and other constants used throughout the E2E test suite.
 */

// ============================================================================
// Test Addresses
// ============================================================================

export const TEST_ADDRESSES = {
  /**
   * Zero address - used for various tests
   */
  ZERO: '0x0000000000000000000000000000000000000000' as const,

  /**
   * Burn address - used for transaction tests
   */
  BURN: '0x000000000000000000000000000000000000dead' as const,

  /**
   * Generic test recipient address
   */
  TEST_RECIPIENT: '0x0000000000000000000000000000000000000001' as const,

  /**
   * Alternative test address
   */
  TEST_RECIPIENT_2: '0x0000000000000000000000000000000000000002' as const,
} as const;

// ============================================================================
// Token Configuration
// ============================================================================

export const TOKENS = {
  USDC: {
    decimals: 6,
    testAmount: '100', // Amount in token units
    smallTestAmount: '10', // Smaller amount for testing
  },
  ETH: {
    decimals: 18,
    testAmount: '0.01', // Amount in ETH
  },
} as const;

// ============================================================================
// Test Timing Configuration
// ============================================================================

export const TEST_DELAYS = {
  /**
   * Delay between individual tests in a sequence (milliseconds)
   */
  BETWEEN_TESTS: 500,

  /**
   * Delay for payment status polling (milliseconds)
   */
  PAYMENT_STATUS_POLLING: 500,

  /**
   * Maximum number of retries for payment status checks
   */
  PAYMENT_STATUS_MAX_RETRIES: 10,

  /**
   * Toast notification durations (milliseconds)
   */
  TOAST_SUCCESS_DURATION: 2000,
  TOAST_ERROR_DURATION: 3000,
  TOAST_WARNING_DURATION: 3000,
  TOAST_INFO_DURATION: 5000,
} as const;

// ============================================================================
// SDK Configuration
// ============================================================================

export const SDK_CONFIG = {
  /**
   * Default app name for SDK initialization
   */
  APP_NAME: 'E2E Test Suite',

  /**
   * Default chain IDs for SDK initialization (Base mainnet)
   */
  DEFAULT_CHAIN_IDS: [8453],

  /**
   * App logo URL (optional)
   */
  APP_LOGO_URL: undefined,
} as const;

// ============================================================================
// Test Messages
// ============================================================================

export const TEST_MESSAGES = {
  /**
   * Personal sign test message
   */
  PERSONAL_SIGN: 'Hello from Base Account SDK E2E Test!',

  /**
   * Sub-account sign test message
   */
  SUB_ACCOUNT_SIGN: 'Hello from sub-account!',

  /**
   * Typed data test message
   */
  TYPED_DATA_MESSAGE: 'Hello from E2E tests!',
} as const;

// ============================================================================
// Payment & Subscription Configuration
// ============================================================================

export const PAYMENT_CONFIG = {
  /**
   * Test payment amount
   */
  AMOUNT: '0.01',

  /**
   * Test subscription recurring charge
   */
  SUBSCRIPTION_RECURRING_CHARGE: '9.99',

  /**
   * Test subscription specific charge
   */
  SUBSCRIPTION_CHARGE_AMOUNT: '1.00',

  /**
   * Subscription period in days
   */
  SUBSCRIPTION_PERIOD_DAYS: 30,
} as const;

// ============================================================================
// Spend Permission Configuration
// ============================================================================

export const SPEND_PERMISSION_CONFIG = {
  /**
   * Test allowance amount (in USDC base units - 6 decimals)
   */
  ALLOWANCE: '100',

  /**
   * Smaller spend amount for testing (in USDC base units)
   */
  SPEND_AMOUNT: '10',

  /**
   * Permission period in days
   */
  PERIOD_DAYS: 30,
} as const;

// ============================================================================
// Wallet Send Calls Configuration
// ============================================================================

export const WALLET_SEND_CALLS_CONFIG = {
  /**
   * Version for wallet_sendCalls
   */
  VERSION: '2.0.0',

  /**
   * Version for wallet_connect
   */
  SUB_ACCOUNT_VERSION: '1',

  /**
   * Simple test call (no value transfer)
   */
  SIMPLE_TEST_CALL: {
    to: TEST_ADDRESSES.TEST_RECIPIENT,
    data: '0x',
    value: '0x0',
  },

  /**
   * Burn address call for sub-account tests
   */
  BURN_ADDRESS_CALL: {
    to: TEST_ADDRESSES.BURN,
    data: '0x',
    value: '0x0',
  },
} as const;

// ============================================================================
// Typed Data Configuration
// ============================================================================

export const TYPED_DATA_CONFIG = {
  /**
   * Test typed data domain
   */
  DOMAIN: {
    name: 'E2E Test',
    version: '1',
  },

  /**
   * Test typed data types
   */
  TYPES: {
    TestMessage: [{ name: 'message', type: 'string' }],
  },

  /**
   * Primary type
   */
  PRIMARY_TYPE: 'TestMessage',
} as const;

// ============================================================================
// Test Categories
// ============================================================================

export const TEST_CATEGORIES = [
  'SDK Initialization & Exports',
  'Wallet Connection',
  'Payment Features',
  'Subscription Features',
  'Prolink Features',
  'Spend Permissions',
  'Sub-Account Features',
  'Sign & Send',
  'Provider Events',
] as const;

export type TestCategoryName = (typeof TEST_CATEGORIES)[number];

// ============================================================================
// Playground Pages Configuration
// ============================================================================

export const PLAYGROUND_PAGES = [
  { path: '/', name: 'SDK Playground' },
  { path: '/add-sub-account', name: 'Add Sub-Account' },
  { path: '/import-sub-account', name: 'Import Sub-Account' },
  { path: '/auto-sub-account', name: 'Auto Sub-Account' },
  { path: '/spend-permission', name: 'Spend Permission' },
  { path: '/payment', name: 'Payment' },
  { path: '/pay-playground', name: 'Pay Playground' },
  { path: '/subscribe-playground', name: 'Subscribe Playground' },
  { path: '/prolink-playground', name: 'Prolink Playground' },
] as const;

// ============================================================================
// UI Theme Colors (for Chakra UI)
// ============================================================================

export const UI_COLORS = {
  STATUS: {
    PASSED: 'green.500',
    FAILED: 'red.500',
    RUNNING: 'blue.500',
    SKIPPED: 'gray.500',
    PENDING: 'gray.400',
    CONNECTED: 'green.500',
    DISCONNECTED: 'gray.400',
  },
  THEME: {
    PRIMARY: 'purple.500',
    SECONDARY: 'gray.800',
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format chain ID as hex string
 */
export function toHexChainId(chainId: number): `0x${string}` {
  return `0x${chainId.toString(16)}` as `0x${string}`;
}
