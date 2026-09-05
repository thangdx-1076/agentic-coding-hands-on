import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Two runners in one config via `projects` (stable since vitest 3.2 — this
 * repo pins 3.2.7, past the rename from `workspace`; `environmentMatchGlobs`
 * is deprecated as of v3, so it is deliberately not used):
 *
 *  - `node`  — pure-logic helpers (`lib/**`) plus the Server Actions and
 *    Route Handler under `app/**` that only need their Next.js/Supabase
 *    boundary mocked, never a DOM.
 *  - `jsdom` — hooks (`hooks/**`) that touch `document`, focus and keyboard
 *    events. jsdom over happy-dom on purpose: focus/event semantics are
 *    exactly the edge-case territory happy-dom trims for speed, and at two
 *    hook files the speed difference is noise.
 *
 * `resolve.alias` and `coverage` live at ROOT (vitest requires this) and are
 * inherited by both projects via the default `extends: true`.
 */
export default defineConfig({
  resolve: {
    // Mirror `tsconfig.json`'s `paths` ({"@/*": ["./*"]}). Vitest does not read
    // tsconfig paths, and until now nothing caught that: every `@/` import a
    // test reached was intercepted by `vi.mock` before resolution ever ran.
    // The first REAL `@/` import between two lib modules
    // (`sign-in-with-google.ts` -> `next-path.ts`) failed to resolve.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    // MSW patches Node's http/fetch layer at the process level, below whatever
    // DOM shim supplies globals — so this is environment-agnostic and belongs
    // at ROOT, applying to both projects, rather than per-project.
    setupFiles: ["./tests/setup/msw-node.ts"],
    // The Supabase factories read these at module scope with `!` assertions.
    // Placeholders, never real credentials: no test reaches a real instance —
    // MSW intercepts every request that would leave the process.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["hooks/**/*.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
      // An explicit ALLOWLIST is what makes the percentage mean something.
      // Without it v8 reports only the files a test happened to import, so an
      // untested module does not lower the number — it vanishes from the table
      // entirely (measured 2026-09-05: the default config reported "97.05%"
      // while covering exactly ONE file).
      //
      // Every entry below is testable under vitest by mocking its
      // Next.js/Supabase boundary. Note what is NOT here: there is no `.tsx`
      // glob anywhere. That extension mismatch — not a maintained exclude
      // list — is the mechanism that keeps `components/**` and
      // `app/**/page.tsx` out of the denominator. Two different reasons, both
      // first-party: async Server Components are unsupported by vitest per
      // Next.js's own testing guide, and components are documented by
      // Storybook rather than unit-tested (a product decision).
      //
      // Adding a `.tsx` glob here would silently re-break the number.
      include: [
        "lib/**/*.ts",
        "hooks/**/*.ts",
        "app/actions/**/*.ts",
        "app/todo/actions.ts",
        "app/auth/callback/route.ts",
      ],
      exclude: ["**/*.test.ts"],
      // A real gate, not a printed number: below 100% the process exits
      // non-zero and CI fails. Turned on only AFTER the suite already reached
      // 100% -- a threshold switched on early just blocks everyone until
      // someone backfills, which is not what a standard is for.
      //
      // Its meaning is narrow and honest: every pure helper, every hook's
      // observable state machine, and each Server Action / Route Handler's own
      // logic is exercised. It does NOT say Server Components render
      // correctly, that real Supabase/Google OAuth works, or that the UI looks
      // right -- Playwright and Storybook own those.
      thresholds: { 100: true },
    },
  },
});
