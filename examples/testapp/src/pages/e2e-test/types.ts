/**
 * Type definitions for E2E Test Suite
 */

import type { EIP1193Provider } from 'viem';

// ============================================================================
// Test Status & Results Types
// ============================================================================

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface TestResult {
  name: string;
  status: TestStatus;
  error?: string;
  details?: string;
  duration?: number;
}

export interface TestCategory {
  name: string;
  tests: TestResult[];
  expanded: boolean;
}

export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

// ============================================================================
// SDK Types
// ============================================================================

export interface CoinbaseWalletSDK {
  getProvider: () => EIP1193Provider;
}

// Using a more flexible approach for LoadedSDK to match actual SDK exports
// We use 'any' strategically here because the SDK has complex types that vary
// between local and npm versions. Tests will validate actual behavior.
export interface LoadedSDK {
  // biome-ignore lint/suspicious/noExplicitAny: SDK types vary between local and npm versions
  createCoinbaseWalletSDK: (config: SDKConfig) => any; // Returns SDK instance with getProvider
  VERSION: string;
}

export interface SDKConfig {
  appName: string;
  appLogoUrl?: string;
  preference?: {
    walletUrl?: string;
    // biome-ignore lint/suspicious/noExplicitAny: SDK types vary between local and npm versions
    attribution?: any;
    telemetry?: boolean;
  };
}

export interface CryptoKeyAccount {
  address: string;
  publicKey?: string;
  type?: string;
}

// ============================================================================
// SDK Loader Types
// ============================================================================

export type SDKSource = 'local' | 'npm';

export interface SDKLoaderConfig {
  source: SDKSource;
}

// ============================================================================
// Test Context & Handler Types
// ============================================================================

export interface TestContext {
  provider: EIP1193Provider;
  loadedSDK: LoadedSDK;
  connected: boolean;
  currentAccount: string | null;
  chainId: number | null;
  // Configuration
  skipModal: boolean;
  walletUrl?: string;
}

export interface TestHandlers {
  updateTestStatus: (
    category: string,
    testName: string,
    status: TestStatus,
    error?: string,
    details?: string,
    duration?: number
  ) => void;
  requestUserInteraction?: (testName: string, skipModal?: boolean) => Promise<void>;
}

export interface TestConfig {
  category: string;
  name: string;
  requiresProvider?: boolean;
  requiresSDK?: boolean;
  requiresConnection?: boolean;
  requiresUserInteraction?: boolean;
}

export interface TestFunction<T = unknown> {
  (context: TestContext): Promise<T>;
}

// ============================================================================
// Format Results Types
// ============================================================================

export type ResultFormat = 'full' | 'abbreviated' | 'section';

export interface FormatOptions {
  format: ResultFormat;
  categoryName?: string; // For section format
  sdkInfo: {
    version: string;
    source: string;
  };
}

// ============================================================================
// Header Props Types
// ============================================================================

export interface HeaderProps {
  sdkVersion: string;
  sdkSource: SDKSource;
  onSourceChange: (source: SDKSource) => void;
  isLoadingSDK?: boolean;
}
