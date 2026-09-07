import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * Port the suite drives, overridable with `E2E_PORT`. Defaults to 3000, so CI
 * and every existing local workflow are unchanged.
 *
 * Why this is configurable at all: `reuseExistingServer` below is `true`
 * off-CI, so Playwright does NOT start a dev server when something already
 * holds the port — it silently drives whatever is there. If another project's
 * dev server owns 3000, the whole suite runs against the wrong application and
 * reports a result that looks real and means nothing (this actually happened —
 * an entire visual-evidence pass captured a different app's 404 page). When
 * 3000 is occupied by something you'd rather not kill, run
 * `E2E_PORT=3100 pnpm test:e2e` instead of fighting for the port.
 */
const PORT = process.env.E2E_PORT ?? "3000";
const BASE_URL = `http://localhost:${PORT}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "list",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: BASE_URL,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT,
      EVENT_START_AT: "2099-12-31T18:30:00+07:00",
    },
  },
});
