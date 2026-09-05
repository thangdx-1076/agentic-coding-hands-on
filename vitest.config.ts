import { defineConfig } from "vitest/config";

/**
 * Unit runner for pure-logic helpers only (e.g. `lib/i18n/locale.ts`).
 * No jsdom/browser environment is needed — components/UI are covered by
 * the E2E suite (Playwright) per the plan's single-runner decision.
 *
 * Coverage (`vitest run --coverage`) is enabled via @vitest/coverage-v8,
 * which generates text and HTML reports to `coverage/`. No thresholds are
 * configured (see phase-04.md § Key Insights).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      // An explicit `include` is what makes the percentage mean something.
      // Without it v8 reports only the files a test happened to import, so an
      // untested module does not lower the number — it vanishes from the table
      // entirely. Measured on 2026-09-05: the default config reported "97.05%"
      // while covering exactly ONE file (`next-path.ts`). With the include,
      // the same run reports ~72% and correctly shows the three Supabase
      // client factories at 0%. (Vitest 3 covers every `include` match by
      // default — there is no `coverage.all` option to set.)
      // Scope = the pure-logic helper layer this runner is responsible for
      // (see the file header). `app/` and `components/` are deliberately OUT:
      // they are exercised by the Playwright suite, which this number does not
      // and must not claim to measure. Widening this include without also
      // measuring E2E would understate real coverage just as badly as the
      // default overstated it.
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts"],
    },
  },
});
