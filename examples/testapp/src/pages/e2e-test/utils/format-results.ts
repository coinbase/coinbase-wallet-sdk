/**
 * Utilities for formatting and copying test results
 */

import type { FormatOptions, TestCategory, TestResult, TestStatus } from '../types';

// ============================================================================
// Status Utilities
// ============================================================================

/**
 * Get the emoji icon for a test status
 */
export function getStatusIcon(status: TestStatus): string {
  switch (status) {
    case 'passed':
      return '✅';
    case 'failed':
      return '❌';
    case 'running':
      return '⏳';
    case 'skipped':
      return '⊘';
    default:
      return '⏸';
  }
}

/**
 * Get the Chakra UI color for a test status
 */
export function getStatusColor(status: TestStatus): string {
  switch (status) {
    case 'passed':
      return 'green.500';
    case 'failed':
      return 'red.500';
    case 'running':
      return 'blue.500';
    case 'skipped':
      return 'gray.500';
    default:
      return 'gray.400';
  }
}

// ============================================================================
// Result Formatting Functions
// ============================================================================

/**
 * Calculate test statistics from categories
 */
function calculateStats(categories: TestCategory[]): {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
} {
  return categories.reduce(
    (acc, cat) => ({
      total: acc.total + cat.tests.length,
      passed: acc.passed + cat.tests.filter((t) => t.status === 'passed').length,
      failed: acc.failed + cat.tests.filter((t) => t.status === 'failed').length,
      skipped: acc.skipped + cat.tests.filter((t) => t.status === 'skipped').length,
    }),
    { total: 0, passed: 0, failed: 0, skipped: 0 }
  );
}

/**
 * Format header section with SDK info and timestamp
 */
function formatHeader(
  title: string,
  sdkInfo: { version: string; source: string },
  stats?: { total: number; passed: number; failed: number; skipped: number }
): string {
  let header = `=== ${title} ===\n\n`;
  header += `SDK Version: ${sdkInfo.version}\n`;
  header += `SDK Source: ${sdkInfo.source}\n`;
  header += `Timestamp: ${new Date().toISOString()}\n\n`;

  if (stats) {
    header += 'Summary:\n';
    header += `  Total: ${stats.total}\n`;
    header += `  Passed: ${stats.passed}\n`;
    header += `  Failed: ${stats.failed}\n`;
    header += `  Skipped: ${stats.skipped}\n\n`;
  }

  return header;
}

/**
 * Format a single test result with details
 */
function formatTestResult(test: TestResult): string {
  const statusSymbol = getStatusIcon(test.status);
  let result = `${statusSymbol} ${test.name}\n`;
  result += `   Status: ${test.status.toUpperCase()}\n`;

  if (test.duration) {
    result += `   Duration: ${test.duration}ms\n`;
  }

  if (test.details) {
    result += `   Details: ${test.details}\n`;
  }

  if (test.error) {
    result += `   ERROR: ${test.error}\n`;
  }

  result += '\n';
  return result;
}

/**
 * Format detailed results for all categories or a specific category
 */
function formatDetailedResults(categories: TestCategory[], includeFailureSummary = true): string {
  let result = '';

  // Format each category
  categories.forEach((category) => {
    if (category.tests.length > 0) {
      result += `\n${category.name}\n`;
      result += `${'='.repeat(category.name.length)}\n\n`;

      category.tests.forEach((test) => {
        result += formatTestResult(test);
      });
    }
  });

  // Add failed tests summary if requested
  if (includeFailureSummary) {
    const failedCategories = categories.filter((cat) =>
      cat.tests.some((t) => t.status === 'failed')
    );

    if (failedCategories.length > 0) {
      result += '\n=== Failed Tests Summary ===\n\n';

      failedCategories.forEach((category) => {
        const failedTests = category.tests.filter((t) => t.status === 'failed');
        if (failedTests.length > 0) {
          result += `${category.name}:\n`;
          failedTests.forEach((test) => {
            result += `  ❌ ${test.name}\n`;
            result += `     Reason: ${test.error || 'Unknown error'}\n`;
            if (test.details) {
              result += `     Details: ${test.details}\n`;
            }
          });
          result += '\n';
        }
      });
    }
  }

  return result;
}

/**
 * Format abbreviated results (passed/failed only, with collapsing)
 */
function formatAbbreviatedResults(categories: TestCategory[]): string {
  let result = '';

  categories.forEach((category) => {
    // Filter out skipped tests - only show passed and failed
    const relevantTests = category.tests.filter(
      (t) => t.status === 'passed' || t.status === 'failed'
    );

    if (relevantTests.length > 0) {
      // Special handling for SDK Initialization & Exports - collapse exports
      if (category.name === 'SDK Initialization & Exports') {
        const initTest = relevantTests.find((t) => t.name === 'SDK can be initialized');
        const exportTests = relevantTests.filter((t) => t.name.includes('is exported'));
        const otherTests = relevantTests.filter((t) => t !== initTest && !exportTests.includes(t));

        // Show SDK initialization test (commented out to skip in abbreviated)
        // if (initTest) {
        //   const icon = initTest.status === 'passed' ? ':check:' : ':failure_icon:';
        //   result += `${icon} ${initTest.name}\n`;
        // }

        // Collapse export tests
        if (exportTests.length > 0) {
          const anyExportsFailed = exportTests.some((t) => t.status === 'failed');

          if (anyExportsFailed) {
            // Show which exports failed
            exportTests.forEach((test) => {
              if (test.status === 'failed') {
                result += `:failure_icon: ${test.name}\n`;
              }
            });
          }
          // Skip showing "all exports passed" in abbreviated results
        }

        // Show any other tests
        otherTests.forEach((test) => {
          const icon = test.status === 'passed' ? ':check:' : ':failure_icon:';
          result += `${icon} ${test.name}\n`;
        });
      } else if (category.name === 'Provider Events') {
        // Collapse provider events listeners
        const listenerTests = relevantTests.filter((t) => t.name.includes('listener'));

        if (listenerTests.length > 0) {
          const anyListenersFailed = listenerTests.some((t) => t.status === 'failed');

          if (anyListenersFailed) {
            // Show which listeners failed
            listenerTests.forEach((test) => {
              if (test.status === 'failed') {
                result += `:failure_icon: ${test.name}\n`;
              }
            });
          }
          // Skip showing "all listeners passed" in abbreviated results
        }
      } else {
        // For other categories, show all tests individually
        relevantTests.forEach((test) => {
          const icon = test.status === 'passed' ? ':check:' : ':failure_icon:';
          result += `${icon} ${test.name}\n`;
        });
      }
    }
  });

  return result;
}

/**
 * Main function to format test results based on options
 */
export function formatTestResults(categories: TestCategory[], options: FormatOptions): string {
  const { format, categoryName, sdkInfo } = options;

  // Filter categories if section format
  const targetCategories =
    format === 'section' && categoryName
      ? categories.filter((cat) => cat.name === categoryName)
      : categories;

  // Calculate stats
  const stats = calculateStats(targetCategories);

  // Format based on type
  let result = '';

  if (format === 'abbreviated') {
    // No header for abbreviated format
    result = formatAbbreviatedResults(targetCategories);
  } else if (format === 'section') {
    // Section format
    const title = categoryName ? `${categoryName} Test Results` : 'E2E Test Results';
    result = formatHeader(title, sdkInfo, stats);

    // For section, show category name again
    if (categoryName && targetCategories.length > 0) {
      result += `${categoryName}\n`;
      result += `${'='.repeat(categoryName.length)}\n\n`;
    }

    // Format tests
    targetCategories.forEach((category) => {
      category.tests.forEach((test) => {
        result += formatTestResult(test);
      });
    });

    // Add failed tests summary for section
    const failedTests = targetCategories.flatMap((cat) =>
      cat.tests.filter((t) => t.status === 'failed')
    );

    if (failedTests.length > 0) {
      result += '\n=== Failed Tests ===\n\n';
      failedTests.forEach((test) => {
        result += `  ❌ ${test.name}\n`;
        result += `     Reason: ${test.error || 'Unknown error'}\n`;
        if (test.details) {
          result += `     Details: ${test.details}\n`;
        }
        result += '\n';
      });
    }
  } else {
    // Full format
    result = formatHeader('E2E Test Results', sdkInfo, stats);
    result += formatDetailedResults(targetCategories, true);
  }

  return result;
}

/**
 * Helper to check if there are any test results
 */
export function hasTestResults(categories: TestCategory[]): boolean {
  return categories.some((cat) => cat.tests.length > 0);
}

/**
 * Helper to check if a specific category has results
 */
export function categoryHasResults(categories: TestCategory[], categoryName: string): boolean {
  const category = categories.find((cat) => cat.name === categoryName);
  return category ? category.tests.length > 0 : false;
}
