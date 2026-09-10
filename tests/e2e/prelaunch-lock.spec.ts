import { test, expect } from "@playwright/test";

/**
 * E2E tests for the prelaunch navigation lock when ON
 * ======================================================
 *
 * Durable proof of this screen's core requirement — FR-102, FR-103, CAP-02,
 * BR-001/BR-002/BR-003 — that `tests/e2e/prelaunch.spec.ts:128` never
 * covers: that file's `[C6]` only exercises the lock OFF (the default).
 *
 * This file runs on a SECOND dev server, started by `playwright.config.ts`'s
 * `prelaunch-lock` project, with `PRELAUNCH_LOCK_ENABLED=true` baked into
 * that server's `webServer.env`. An env flag cannot vary inside one running
 * process, so proving the ON branch needs its own server, not just another
 * test against the existing one — see plan.md § "Key Insights".
 *
 * `src/proxy.ts` itself sits outside this repo's unit-test coverage
 * allowlist — this e2e file IS that missing layer. Do not add a unit test
 * for `src/proxy.ts` directly; the pure decision table it delegates to
 * (`planProxy`) already has one at `src/domain/prelaunch-lock.test.ts`.
 *
 * No `@auth`/`@local-db` tag anywhere in this file: no session, no
 * Supabase — it belongs in, and runs under, CI's
 * `--grep-invert "@auth|@local-db"` step.
 *
 * MoMorph screen: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU
 */

test.describe("Prelaunch lock ON: redirect gate", () => {
  // Anonymous user — no auth required for any of these routes while locked.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[PL0] sanity: /prelaunch itself responds 200 with the timer visible (confirms this is the lock server, not a stray port owner)", async ({
    page,
  }) => {
    const res = await page.goto("/prelaunch");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("timer")).toBeVisible();
  });

  test("[PL1] / redirects to /prelaunch when the lock is ON and the event has not started", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/prelaunch$/);
  });

  test("[PL2] /login redirects to /prelaunch when the lock is ON and the event has not started", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/prelaunch$/);
  });

  test("[PL3] /kudos redirects to /prelaunch when the lock is ON and the event has not started", async ({
    page,
  }) => {
    // /kudos is not one of the legacy 6 routes the proxy used to guard — it
    // only reaches the lock branch because `config.matcher` was widened
    // (phase 04 / CAP-02). Covering it proves the widened matcher redirects
    // too, not just the routes the proxy already knew about.
    await page.goto("/kudos");
    await expect(page).toHaveURL(/\/prelaunch$/);
  });

  test("[PL4] /prelaunch does not redirect again while the lock is ON and unreached (no loop)", async ({
    page,
  }) => {
    // The redirect this file guards against happens server-side in
    // `src/proxy.ts`, before the response body is ever sent — by the time
    // `goto`'s "load" resolves, any redirect has already happened, so
    // there is nothing further to wait out here.
    await page.goto("/prelaunch");
    await expect(page).toHaveURL(/\/prelaunch$/);
  });
});
