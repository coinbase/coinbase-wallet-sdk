/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

export default {
  // Automatically clear mock calls, instances and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    "./src/util.ts",
    "./src/CoinbaseWalletSDK.ts",
    "./src/connection/RxWebSocket.ts",
    "./src/connection/WalletSDKConnection.ts",
    "./src/lib/ScopedLocalStorage.ts",
    "./src/provider/CoinbaseWalletProvider.ts",
    "./src/provider/SolanaProvider.ts",
    "./src/provider/FilterPolyfill.ts",
    "./src/provider/SubscriptionManager.ts",
    "./src/provider/WalletSDKUI.ts",
    "./src/relay/aes256gcm.ts",
    "./src/relay/Session.ts",
    "./src/relay/WalletSDKRelay.ts",
    "./src/relay/WalletSDKRelayEventManager.ts",
    "./src/components/**/*.tsx",
  ],
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: ["/node_modules/"],

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: ["json", "text", "text-summary", "lcov"],

  // TODO: Increase threshold as additional tests are added
  coverageThreshold: {
    global: {
      branches: 54,
      functions: 55,
      statements: 63,
    },
  },

  // An array of file extensions your modules use
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json", "node"],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
  },

  // A list of paths to directories that Jest should use to search for files in
  roots: ["<rootDir>/src"],

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // The test environment that will be used for testing
  testEnvironment: "jsdom",

  // The glob patterns Jest uses to detect test files
  testMatch: ["<rootDir>/src/**/*.test.[tj]s?(x)"],

  // A map from regular expressions to paths to transformers
  transform: {
    "^.+\\.(js|ts|tsx)$": ["babel-jest"],
  },

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  testPathIgnorePatterns: ["/node_modules/", "/build/"],
};
