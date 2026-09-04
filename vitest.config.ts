import { defineConfig } from "vitest/config";

/**
 * Unit runner for pure-logic helpers only (e.g. `lib/i18n/locale.ts`).
 * No jsdom/browser environment is needed — components/UI are covered by
 * the E2E suite (Playwright) per the plan's single-runner decision.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
