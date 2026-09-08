import { describe, expect, it } from "vitest";

import { redirectStatusFor } from "./redirect-status";

/**
 * Guards the defect `c57efb7` fixed. The e2e suite cannot reach it —
 * `playwright.config.ts` pins the webServer env for the whole run, so no test
 * can turn the prelaunch lock on — and `src/proxy.ts`, the only caller, is
 * outside every coverage glob. Without these cases a later "simplification"
 * back to a bare `NextResponse.redirect(url)` would silently restore the
 * Server Action 404 with nothing red to show for it.
 */
describe("redirectStatusFor", () => {
  it("GET keeps Next's default (undefined → 307)", () => {
    expect(redirectStatusFor("GET")).toBeUndefined();
  });

  it("HEAD keeps Next's default (undefined → 307)", () => {
    expect(redirectStatusFor("HEAD")).toBeUndefined();
  });

  it("POST gets 303 — a Server Action must not be re-POSTed to the target", () => {
    expect(redirectStatusFor("POST")).toBe(303);
  });

  it.each(["PUT", "PATCH", "DELETE", "OPTIONS"])(
    "%s gets 303 too",
    (method) => {
      expect(redirectStatusFor(method)).toBe(303);
    },
  );
});
