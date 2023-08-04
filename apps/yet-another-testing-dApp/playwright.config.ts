import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "tests",
  outputDir: "test-results",
  fullyParallel: true,
  timeout: 1 * 60 * 1000,
  workers: 1,
  reporter: "html",
  retries: 3,

  // globalSetup: require.resolve("./globalSetup"),
  // use: {
  //   storageState: "storage.json",
  // },
  use: {
    // Base URL to use in actions like `await page.goto('/')`.
    baseURL: "https://yet-another-testing-dapp.netlify.app",
  },

  projects: [
    {
      name: "e2e",
      use: {
        ...devices["Desktop Chrome"],
        // screenshot: "only-on-failure",
        trace: "retain-on-failure",
        video: "retain-on-failure",
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "yarn dev",
    url: "http://localhost:3000",
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});
