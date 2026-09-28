/**
 * Hook for managing test execution state
 *
 * Consolidates test categories, test results, and running section tracking
 * into a single cohesive state manager using reducer pattern.
 */

import { useCallback, useReducer } from 'react';
import { TEST_CATEGORIES } from '../../../utils/e2e-test-config';
import type { TestCategory, TestResults, TestStatus } from '../types';

// ============================================================================
// Types
// ============================================================================

interface TestState {
  categories: TestCategory[];
  results: TestResults;
  runningSectionName: string | null;
  isRunningTests: boolean;
}

type TestAction =
  | {
      type: 'UPDATE_TEST_STATUS';
      payload: {
        category: string;
        testName: string;
        status: TestStatus;
        error?: string;
        details?: string;
        duration?: number;
      };
    }
  | { type: 'RESET_CATEGORY'; payload: string }
  | { type: 'RESET_ALL_CATEGORIES' }
  | { type: 'START_TESTS' }
  | { type: 'STOP_TESTS' }
  | { type: 'SET_RUNNING_SECTION'; payload: string | null }
  | { type: 'TOGGLE_CATEGORY_EXPANDED'; payload: string };

// ============================================================================
// Initial State
// ============================================================================

const initialCategories: TestCategory[] = TEST_CATEGORIES.map((name) => ({
  name,
  tests: [],
  expanded: true,
}));

const initialState: TestState = {
  categories: initialCategories,
  results: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  },
  runningSectionName: null,
  isRunningTests: false,
};

// ============================================================================
// Reducer
// ============================================================================

function testStateReducer(state: TestState, action: TestAction): TestState {
  switch (action.type) {
    case 'UPDATE_TEST_STATUS': {
      const { category, testName, status, error, details, duration } = action.payload;

      const updatedCategories = state.categories.map((cat) => {
        if (cat.name === category) {
          const existingTestIndex = cat.tests.findIndex((t) => t.name === testName);

          if (existingTestIndex >= 0) {
            // Update existing test
            const updatedTests = [...cat.tests];
            updatedTests[existingTestIndex] = {
              name: testName,
              status,
              error,
              details,
              duration,
            };
            return { ...cat, tests: updatedTests };
          }

          // Add new test
          return {
            ...cat,
            tests: [...cat.tests, { name: testName, status, error, details, duration }],
          };
        }
        return cat;
      });

      // Update totals if test is finalized
      let updatedResults = state.results;
      if (status === 'passed' || status === 'failed' || status === 'skipped') {
        // Check if this is a new final status (not an update)
        const oldCategory = state.categories.find((c) => c.name === category);
        const oldTest = oldCategory?.tests.find((t) => t.name === testName);
        const wasNotFinal =
          !oldTest || oldTest.status === 'pending' || oldTest.status === 'running';

        if (wasNotFinal) {
          updatedResults = {
            total: state.results.total + 1,
            passed: state.results.passed + (status === 'passed' ? 1 : 0),
            failed: state.results.failed + (status === 'failed' ? 1 : 0),
            skipped: state.results.skipped + (status === 'skipped' ? 1 : 0),
          };
        }
      }

      return {
        ...state,
        categories: updatedCategories,
        results: updatedResults,
      };
    }

    case 'RESET_CATEGORY': {
      const updatedCategories = state.categories.map((cat) =>
        cat.name === action.payload ? { ...cat, tests: [] } : cat
      );
      return {
        ...state,
        categories: updatedCategories,
      };
    }

    case 'RESET_ALL_CATEGORIES':
      return {
        ...state,
        categories: state.categories.map((cat) => ({ ...cat, tests: [] })),
        results: {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
        },
      };

    case 'START_TESTS':
      return {
        ...state,
        isRunningTests: true,
      };

    case 'STOP_TESTS':
      return {
        ...state,
        isRunningTests: false,
      };

    case 'SET_RUNNING_SECTION':
      return {
        ...state,
        runningSectionName: action.payload,
      };

    case 'TOGGLE_CATEGORY_EXPANDED': {
      const updatedCategories = state.categories.map((cat) =>
        cat.name === action.payload ? { ...cat, expanded: !cat.expanded } : cat
      );
      return {
        ...state,
        categories: updatedCategories,
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

export interface UseTestStateReturn {
  // State
  testCategories: TestCategory[];
  testResults: TestResults;
  runningSectionName: string | null;
  isRunningTests: boolean;

  // Actions
  updateTestStatus: (
    category: string,
    testName: string,
    status: TestStatus,
    error?: string,
    details?: string,
    duration?: number
  ) => void;
  resetCategory: (categoryName: string) => void;
  resetAllCategories: () => void;
  startTests: () => void;
  stopTests: () => void;
  setRunningSectionName: (name: string | null) => void;
  toggleCategoryExpanded: (categoryName: string) => void;
}

export function useTestState(): UseTestStateReturn {
  const [state, dispatch] = useReducer(testStateReducer, initialState);

  const updateTestStatus = useCallback(
    (
      category: string,
      testName: string,
      status: TestStatus,
      error?: string,
      details?: string,
      duration?: number
    ) => {
      dispatch({
        type: 'UPDATE_TEST_STATUS',
        payload: { category, testName, status, error, details, duration },
      });
    },
    []
  );

  const resetCategory = useCallback((categoryName: string) => {
    dispatch({ type: 'RESET_CATEGORY', payload: categoryName });
  }, []);

  const resetAllCategories = useCallback(() => {
    dispatch({ type: 'RESET_ALL_CATEGORIES' });
  }, []);

  const startTests = useCallback(() => {
    dispatch({ type: 'START_TESTS' });
  }, []);

  const stopTests = useCallback(() => {
    dispatch({ type: 'STOP_TESTS' });
  }, []);

  const setRunningSectionName = useCallback((name: string | null) => {
    dispatch({ type: 'SET_RUNNING_SECTION', payload: name });
  }, []);

  const toggleCategoryExpanded = useCallback((categoryName: string) => {
    dispatch({ type: 'TOGGLE_CATEGORY_EXPANDED', payload: categoryName });
  }, []);

  return {
    // State
    testCategories: state.categories,
    testResults: state.results,
    runningSectionName: state.runningSectionName,
    isRunningTests: state.isRunningTests,

    // Actions
    updateTestStatus,
    resetCategory,
    resetAllCategories,
    startTests,
    stopTests,
    setRunningSectionName,
    toggleCategoryExpanded,
  };
}
