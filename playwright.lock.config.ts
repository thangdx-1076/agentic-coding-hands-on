import { defineConfig, devices } from "@playwright/test";

/**
 * Dedicated Playwright config for `tests/e2e/prelaunch-lock.spec.ts` only
 * (phase 04 / FR-102, FR-103, CAP-02) — the predefined fallback from that
 * phase's plan, not an improvisation.
 *
 * Why a whole second config file instead of a second `webServer` entry in
 * `playwright.config.ts`: `PRELAUNCH_LOCK_ENABLED` can only be set at
 * server-start (`webServer.env` is fixed for a process's lifetime), so
 * proving the lock ON needs its own `next dev`. Two `next dev` processes
 * for the SAME repo directory cannot coexist even on different ports —
 * `next dev` takes an exclusive lock at `.next/dev/lock`, keyed by
 * directory, not by port. Confirmed 2026-09-10: starting a second `pnpm dev`
 * here against an already-`✓ Ready` first one makes the second one print
 * "✓ Ready" and then immediately self-abort with "Another next dev server
 * is already running." — a hard, deterministic conflict, not a startup
 * race. This config is only ever invoked on its own (`pnpm test:e2e:lock`,
 * a separate CI step), never in the same process as `playwright.config.ts`,
 * so its server never overlaps with the default one's.
 *
 * Run: `pnpm test:e2e:lock` (equivalent to
 * `playwright test --config=playwright.lock.config.ts`).
 */
const LOCK_PORT = process.env.E2E_LOCK_PORT ?? "3001";
const LOCK_BASE_URL = `http://localhost:${LOCK_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/prelaunch-lock.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: LOCK_BASE_URL,
  },

  projects: [
    {
      name: "prelaunch-lock",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: `pnpm dev --port ${LOCK_PORT}`,
    url: LOCK_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      PORT: LOCK_PORT,
      EVENT_START_AT: "2099-12-31T18:30:00+07:00",
      PRELAUNCH_LOCK_ENABLED: "true",
    },
  },
});
