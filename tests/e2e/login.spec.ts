import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "node:crypto";

import { test, expect, Route } from "@playwright/test";

import {
  createTestSession,
  generateSupabaseCookies,
  injectSupabaseSession,
} from "./helpers/sign-in";
import { deleteTestUser } from "./helpers/service-role";
import { supabaseReachable } from "./helpers/supabase-reachable";

/** Shape reported by the browser-side MutationObserver in the "Button
 * disabled during authentication" test below, via `window.__reportBtnState`. */
interface ButtonState {
  disabled: boolean;
  ariabusy: string | null;
  hasSpinner: boolean;
}

declare global {
  interface Window {
    /** Exposed via `page.exposeFunction` — see the test that installs it. */
    __reportBtnState: (json: string) => void;
  }
}

// Load environment variables from .env.local for Node process
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const [key, value] = line.split("=");
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}
loadEnv();

test.describe("Login Screen", () => {
  test.describe("Unauthenticated", () => {
    // Ensure no auth cookies for unauthenticated tests
    test.use({ storageState: { cookies: [], origins: [] } });

    test("[TC b9805e65] Logo top-left position", async ({ page }) => {
      await page.goto("/login");

      const logo = page.locator('header img[alt="Sun* Annual Awards 2025"]');
      await expect(logo).toBeVisible();

      // Verify it's in the header (top-left area)
      const header = page.locator("header");
      await expect(header).toBeVisible();
      const box = await logo.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.y).toBeLessThan(100); // Logo should be near the top
    });

    test("[TC 8415b629] Language selector top-right", async ({ page }) => {
      await page.goto("/login");

      // Scope to header to avoid matching Next.js dev tools button
      const selector = page.locator('header button[aria-haspopup="menu"]');
      await expect(selector).toBeVisible();

      // Check accessible name contains "VN"
      const accessibleName =
        (await selector.getAttribute("aria-label")) ||
        (await selector.textContent()) ||
        (await selector.innerText());
      expect(accessibleName).toContain("VN");
    });

    test("[TC 5fbe2a18] Hero artwork presence", async ({ page }) => {
      await page.goto("/login");

      const heroImage = page.locator('img[alt="ROOT FURTHER"]');
      await expect(heroImage).toBeVisible();

      // Regression guard (fix 2026-09-05): the key-visual background bitmap
      // (Figma node 662:14389 → public/login/keyvisual.png) must actually load,
      // not just be referenced — it was missing and the page fell back to a
      // flat #00101A background.
      const keyVisual = page.locator('img[src*="keyvisual"]');
      await expect(keyVisual).toHaveCount(1);
      // Hit the static file directly: the next/image optimizer cache can keep
      // serving an old rendition after the source file disappears.
      const asset = await page.request.get("/login/keyvisual.png");
      expect(asset.status()).toBe(200);
      expect(asset.headers()["content-type"]).toContain("image/png");
      await expect
        .poll(async () =>
          keyVisual.evaluate((img) => {
            const el = img as HTMLImageElement;
            return el.complete && el.naturalWidth > 0;
          }),
        )
        .toBe(true);
    });

    test("[TC 42b82364] Hero title and description text", async ({ page }) => {
      await page.goto("/login");

      // Title and descriptions should be present
      await expect(
        page.locator("text=Bắt đầu hành trình của bạn cùng SAA 2025"),
      ).toBeVisible();
      await expect(page.locator("text=Đăng nhập để khám phá")).toBeVisible();
    });

    test("[TC 6ae76d15] LOGIN With Google button", async ({ page }) => {
      await page.goto("/login");

      const googleButton = page.locator('button:has-text("LOGIN With Google")');
      await expect(googleButton).toBeVisible();
    });

    test("[TC 33a1dacf] Footer fixed bottom position", async ({ page }) => {
      await page.goto("/login");

      const footer = page.locator("footer");
      await expect(footer).toBeVisible();

      const footerText = page.locator("text=Bản quyền thuộc về Sun* © 2025");
      await expect(footerText).toBeVisible();
    });

    test("[TC 20d87e28] Language dropdown opens on click", async ({ page }) => {
      await page.goto("/login");

      // Scope to header to avoid matching Next.js dev tools button
      const selector = page.locator('header button[aria-haspopup="menu"]');
      await selector.click();

      // Menu should open
      const menu = page.locator('[role="menu"]');
      await expect(menu).toBeVisible();

      // Should have VN and EN menu items
      const vnItem = page.locator('[role="menuitem"]:has-text("VN")');
      const enItem = page.locator('[role="menuitem"]:has-text("EN")');
      await expect(vnItem).toBeVisible();
      await expect(enItem).toBeVisible();
    });

    test("[TC 45278c06] Error alert on /login?error=*", async ({ page }) => {
      await page.goto("/login?error=auth_failed");

      // Filter to avoid matching Next.js route announcer (#__next-route-announcer__)
      const alert = page
        .locator('p[role="alert"]')
        .filter({ hasText: /Đăng nhập không thành công/ });
      await expect(alert).toBeVisible();
      await expect(alert).toContainText("Đăng nhập không thành công");
      await expect(alert).toContainText("Vui lòng thử lại");
    });

    test("[TC 45278c06] Unauthenticated GET /todo redirects to /login", async ({
      page,
    }) => {
      await page.goto("/todo");
      await page.waitForURL("/login");
      expect(page.url()).toContain("/login");
    });

    test("[TC 45278c06] GET / renders the public homepage (no redirect)", async ({
      page,
    }) => {
      await page.goto("/");
      expect(page.url()).toContain("/");
      // Verify homepage content is visible
      const h1 = page.locator("h1");
      await expect(h1).toContainText("ROOT FURTHER");
    });

    test("[TC 60bc5bbb] Google button triggers OAuth flow (abort)", async ({
      page,
    }) => {
      // Intercept and abort the authorize endpoint to verify it's called
      let authorizeCalled = false;
      await page.route("**/auth/v1/authorize**", async (route) => {
        const url = route.request().url();
        expect(url).toContain("provider=google");
        authorizeCalled = true;
        await route.abort();
      });

      await page.goto("/login");
      const googleButton = page.locator('button:has-text("LOGIN With Google")');
      await googleButton.click();

      // Poll the flag the route handler sets, instead of an arbitrary sleep.
      // `page.waitForRequest` was tried here but doesn't reliably observe a
      // request that gets aborted mid-navigation, so it isn't a safe swap.
      await expect.poll(() => authorizeCalled).toBe(true);
    });

    test("[TC 37eae882] Button disabled during authentication", async ({
      page,
    }) => {
      // Capture button state via MutationObserver (survives navigation)
      const observed: ButtonState[] = [];

      // Expose function that survives top-level navigation
      await page.exposeFunction("__reportBtnState", (json: string) => {
        observed.push(JSON.parse(json) as ButtonState);
      });

      await page.goto("/login");

      // Install MutationObserver to watch button state
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) =>
          b.textContent?.includes("LOGIN"),
        );
        if (!btn) return;

        const reportState = () => {
          const hasSpinner = !!btn.querySelector(
            ".animate-spin, svg.animate-spin, [data-spinner]",
          );
          window.__reportBtnState(
            JSON.stringify({
              disabled: btn.disabled,
              ariabusy: btn.getAttribute("aria-busy"),
              hasSpinner,
            }),
          );
        };

        // Report initial state
        reportState();

        // Watch for changes
        const observer = new MutationObserver(reportState);
        observer.observe(btn, {
          attributes: true,
          subtree: true,
          childList: true,
        });
      });

      // Route OAuth request to harmless stub
      await page.route("**/auth/v1/authorize**", async (route: Route) => {
        const url = route.request().url();
        expect(url).toContain("provider=google");
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<!doctype html><title>stub</title>",
        });
      });

      // Click button (don't await)
      page
        .locator('button:has-text("LOGIN With Google")')
        .click()
        .catch(() => {});

      // Wait for authorize request
      await page.waitForURL(/auth\/v1\/authorize/);

      // Wait for the MutationObserver to report the loading state — a bounded
      // poll instead of a fixed sleep, so this doesn't flake on a slow runner.
      await expect
        .poll(() =>
          observed.some(
            (state) =>
              state.disabled === true &&
              state.ariabusy === "true" &&
              state.hasSpinner === true,
          ),
        )
        .toBe(true);
    });

    test("[ROUTE001] GET /auth/callback?error=access_denied redirects to /login?error=access_denied", async ({
      page,
    }) => {
      // Simulate OAuth error from Google/GoTrue — error branch redirects
      // immediately without calling createClient() (CI-safe, no Supabase needed)
      await page.goto("/auth/callback?error=access_denied");

      // Should redirect to login with error param
      await page.waitForURL(/\/login\?error=/, { timeout: 5000 });
      expect(page.url()).toContain("/login");
      expect(page.url()).toContain("error=access_denied");
    });

    test("[ROUTE001] GET /auth/callback (no code, no error) redirects to /login?error=auth_code_error", async ({
      page,
    }) => {
      // Missing both code and error — route's fallback redirect (CI-safe)
      await page.goto("/auth/callback");

      // Should redirect to login with error param
      await page.waitForURL(/\/login\?error=auth_code_error/, {
        timeout: 5000,
      });
      expect(page.url()).toContain("/login");
      expect(page.url()).toContain("error=auth_code_error");
    });

    test("[PERM004] GET /auth/callback?next=https://evil.com stays within origin", async ({
      page,
    }) => {
      // Integration test for open-redirect guard: even with a malicious next param,
      // the route's safeNextPath() enforces origin isolation (CI-safe, errors before Supabase call)
      await page.goto("/auth/callback?next=https://evil.com");

      // Should land on /login?error=auth_code_error (missing code), not redirect out
      await page.waitForURL(/\/login\?error=auth_code_error/, {
        timeout: 5000,
      });
      const url = page.url();
      expect(url).toContain("localhost");
      expect(url).not.toContain("evil.com");
    });

    test("[ROUTE001] GET /auth/callback?code=<unusable> falls back to /login?error=auth_code_error", async ({
      page,
    }) => {
      // SCOPE — read before trusting this test's name. It proves the callback's
      // error FALLBACK is reachable and lands on /login?error=auth_code_error.
      // It does NOT prove "Supabase rejected an invalid code", because two
      // different causes funnel into the same catch in app/auth/callback/route.ts
      // and produce an identical redirect:
      //   · Supabase reachable + code genuinely invalid → exchange returns an error
      //   · Supabase unreachable (the CI condition)      → exchange throws on network
      // So in CI this asserts the fallback only. Genuine invalid-code rejection is
      // not separately covered, and neither is the `?code=<valid>` success branch
      // (a real PKCE code/verifier pair only exists after a live Google round-trip
      // — left honestly uncovered, see the notice in .github/workflows/ci.yml).
      // Kept CI-safe deliberately: the fallback is worth gating on in both
      // environments, and the assertion holds for the right reason in each.
      await page.goto("/auth/callback?code=invalid_code_12345");

      // Should redirect to login with error param
      await page.waitForURL(/\/login\?error=auth_code_error/, {
        timeout: 5000,
      });
      expect(page.url()).toContain("/login");
      expect(page.url()).toContain("error=auth_code_error");
    });

    test.describe("Language selector keyboard navigation (ARIA APG)", () => {
      test("[KB a1f8c2d1] ArrowDown on trigger opens menu and focuses first item", async ({
        page,
      }) => {
        await page.goto("/login");

        const button = page.locator('header button[aria-haspopup="menu"]');
        const menu = page.locator('[role="menu"]');

        // Menu should not be visible initially
        await expect(menu).toBeHidden();

        // Focus the button
        await button.focus();

        // Press ArrowDown
        await page.keyboard.press("ArrowDown");

        // Menu should be visible
        await expect(menu).toBeVisible();

        // First menu item should be focused
        const firstItem = page.locator('[role="menuitem"]').nth(0);
        await expect(firstItem).toBeFocused();
      });

      test("[KB c4e7d9f2] ArrowUp on trigger opens menu and focuses last item", async ({
        page,
      }) => {
        await page.goto("/login");

        const button = page.locator('header button[aria-haspopup="menu"]');
        const menu = page.locator('[role="menu"]');

        // Menu should not be visible initially
        await expect(menu).toBeHidden();

        // Focus the button
        await button.focus();

        // Press ArrowUp
        await page.keyboard.press("ArrowUp");

        // Menu should be visible
        await expect(menu).toBeVisible();

        // Last menu item (EN) should be focused
        const lastItem = page.locator('[role="menuitem"]').nth(1);
        await expect(lastItem).toBeFocused();
      });

      test("[KB f7b2a4e8] ArrowDown wraps from last to first item in menu", async ({
        page,
      }) => {
        await page.goto("/login");

        const button = page.locator('header button[aria-haspopup="menu"]');

        // Open menu and focus last item
        await button.focus();
        await page.keyboard.press("ArrowUp"); // Opens at last item

        // Verify last item (EN) is focused
        const lastItem = page.locator('[role="menuitem"]').nth(1);
        await expect(lastItem).toBeFocused();

        // Press ArrowDown to wrap to first
        await page.keyboard.press("ArrowDown");

        // First item (VN) should now be focused
        const firstItem = page.locator('[role="menuitem"]').nth(0);
        await expect(firstItem).toBeFocused();
      });

      test("[KB e3c9b1a5] ArrowUp wraps from first to last item in menu", async ({
        page,
      }) => {
        await page.goto("/login");

        const button = page.locator('header button[aria-haspopup="menu"]');

        // Open menu and focus first item
        await button.focus();
        await page.keyboard.press("ArrowDown"); // Opens at first item

        // Verify first item (VN) is focused
        const firstItem = page.locator('[role="menuitem"]').nth(0);
        await expect(firstItem).toBeFocused();

        // Press ArrowUp to wrap to last
        await page.keyboard.press("ArrowUp");

        // Last item (EN) should now be focused
        const lastItem = page.locator('[role="menuitem"]').nth(1);
        await expect(lastItem).toBeFocused();
      });

      test("[KB d6f1c3b9] Home key jumps to first item in menu", async ({
        page,
      }) => {
        await page.goto("/login");

        const button = page.locator('header button[aria-haspopup="menu"]');

        // Open menu and focus last item
        await button.focus();
        await page.keyboard.press("ArrowUp"); // Opens at last item

        // Verify last item is focused
        const lastItem = page.locator('[role="menuitem"]').nth(1);
        await expect(lastItem).toBeFocused();

        // Press Home to jump to first
        await page.keyboard.press("Home");

        // First item should now be focused
        const firstItem = page.locator('[role="menuitem"]').nth(0);
        await expect(firstItem).toBeFocused();
      });

      test("[KB b8e2d7a4] End key jumps to last item in menu", async ({
        page,
      }) => {
        await page.goto("/login");

        const button = page.locator('header button[aria-haspopup="menu"]');

        // Open menu and focus first item
        await button.focus();
        await page.keyboard.press("ArrowDown"); // Opens at first item

        // Verify first item is focused
        const firstItem = page.locator('[role="menuitem"]').nth(0);
        await expect(firstItem).toBeFocused();

        // Press End to jump to last
        await page.keyboard.press("End");

        // Last item should now be focused
        const lastItem = page.locator('[role="menuitem"]').nth(1);
        await expect(lastItem).toBeFocused();
      });

      test("[KB c5a9f2d3] Escape closes menu and returns focus to trigger", async ({
        page,
      }) => {
        await page.goto("/login");

        const button = page.locator('header button[aria-haspopup="menu"]');
        const menu = page.locator('[role="menu"]');

        // Open menu
        await button.focus();
        await page.keyboard.press("ArrowDown");

        // Menu should be visible
        await expect(menu).toBeVisible();

        // Press Escape
        await page.keyboard.press("Escape");

        // Menu should be hidden
        await expect(menu).toBeHidden();

        // Focus should return to button
        await expect(button).toBeFocused();
      });

      test("[KB a2d8e6f1] Tab closes menu without returning focus to trigger", async ({
        page,
      }) => {
        await page.goto("/login");

        const button = page.locator('header button[aria-haspopup="menu"]');
        const menu = page.locator('[role="menu"]');

        // Open menu
        await button.focus();
        await page.keyboard.press("ArrowDown");

        // Menu should be visible
        await expect(menu).toBeVisible();

        // Press Tab
        await page.keyboard.press("Tab");

        // Menu should be hidden
        await expect(menu).toBeHidden();

        // Focus should move away from button (Tab behavior)
        await expect(button).not.toBeFocused();
      });

      test("[REG 2026-09-05] Focus resets to first item on mouse open after keyboard navigation", async ({
        page,
      }) => {
        await page.goto("/login");

        const button = page.locator('header button[aria-haspopup="menu"]');
        const menu = page.locator('[role="menu"]');
        const firstItem = page.locator('[role="menuitem"]').nth(0); // VN
        const lastItem = page.locator('[role="menuitem"]').nth(1); // EN

        // Step 1: keyboard open with ArrowUp lands on last item
        await button.focus();
        await page.keyboard.press("ArrowUp");

        // Menu should be visible with last item focused
        await expect(menu).toBeVisible();
        await expect(lastItem).toBeFocused();

        // Step 2: Escape closes menu and returns focus to trigger
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
        await expect(button).toBeFocused();

        // Step 3: Mouse click opens menu again
        await button.click();
        await expect(menu).toBeVisible();

        // Step 4: Verify first item (VN) is now focused, not the stale last item
        await expect(firstItem).toBeFocused();
        await expect(lastItem).not.toBeFocused();
      });
    });
  });

  test.describe("Supabase unavailable", () => {
    // These tests exercise the asymmetric fail-open/fail-closed behavior when
    // Supabase is unreachable. They run in CI always (testing the outage paths),
    // and on dev machines only if Supabase is actually down.

    test("[PERM002 fail-open] GET /login renders form even when Supabase is unreachable", async ({
      page,
    }) => {
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
      const isReachable = await supabaseReachable(supabaseUrl);

      // Skip on dev machine if Supabase is up; always run in CI
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip(
        !process.env.CI && isReachable,
        "Supabase is up — outage path not applicable",
      );

      // /login's guard wraps getUser() in try/catch and returns null on error.
      // The page should render the login form (fail-open) even if Supabase is down.
      // This test runs in CI against an unreachable Supabase URL (the default),
      // and is skipped on dev machines if saa-app is running.
      await page.goto("/login");

      // Form should be visible (login button, title, etc.)
      const button = page.locator('button:has-text("LOGIN With Google")');
      await expect(button).toBeVisible();

      // Verify we're on /login (not redirected to error page)
      expect(page.url()).toContain("/login");
    });

    test("[PERM003 fail-closed] GET /todo does not render todo content when Supabase is unreachable", async ({
      page,
    }) => {
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
      const isReachable = await supabaseReachable(supabaseUrl);

      // Skip on dev machine if Supabase is up; always run in CI
      // eslint-disable-next-line playwright/no-skipped-test
      test.skip(
        !process.env.CI && isReachable,
        "Supabase is up — outage path not applicable",
      );

      // /todo's guard calls getUser() without try/catch, so an error causes
      // the page to fail to render. The app should redirect to /login (fail-closed:
      // do not render authenticated content without proven auth).
      // This test verifies the guard's behavior by checking that no todo content
      // is served, and the user is redirected or prevented from seeing the page.
      await page.goto("/todo");

      // Should redirect to /login (fail-closed behavior — no authenticated content
      // is ever served when auth check fails)
      await page.waitForURL(/\/login/, { timeout: 5000 });
      expect(page.url()).toContain("/login");
    });
  });

  test.describe("Authenticated", { tag: "@auth" }, () => {
    // Set up auth before each test
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
    const publishableKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
    const testEmail = `e2e-${Date.now()}@example.com`;
    const testPassword = `e2e-${randomUUID().slice(0, 8)}`; // Random per run, never logged
    let sessionUserId = "";

    test.beforeEach(async ({ context }) => {
      // Create test user
      const session = await createTestSession(
        supabaseUrl,
        publishableKey,
        testEmail,
        testPassword,
      );
      sessionUserId = session.user_id;

      // Generate cookies using @supabase/ssr (ensures correct format)
      const cookies = await generateSupabaseCookies(
        supabaseUrl,
        publishableKey,
        session.access_token,
        session.refresh_token,
      );

      // Inject into browser context
      await injectSupabaseSession(context, cookies);
    });

    // `testEmail` is computed once per worker, so all tests in this block
    // share one user — `afterAll`, not `afterEach`. Without this the block
    // left one `@example.com` user per worker behind on every run.
    test.afterAll(async () => {
      if (sessionUserId) {
        await deleteTestUser(sessionUserId);
        sessionUserId = "";
      }
    });

    test("[TC f62b0c97] Authenticated user redirects /login to /", async ({
      page,
    }) => {
      await page.goto("/login");
      // Should redirect to / (homepage) since user is authenticated
      await page.waitForURL("/", { timeout: 5000 });
      expect(page.url()).toContain("/");
    });

    test("[TC e76aa170] /todo shows user email and logout button", async ({
      page,
    }) => {
      await page.goto("/todo");
      // Should show email in h1
      const heading = page.locator("h1");
      await expect(heading).toContainText("@");
      // Should have logout button
      const logoutButton = page.locator('button:has-text("Đăng xuất")');
      await expect(logoutButton).toBeVisible();
    });

    test("[US003, BL002 signOut] Click logout button, verify redirect to /login, re-check guard blocks /todo", async ({
      page,
    }) => {
      // Navigate to /todo (should succeed with authenticated session)
      await page.goto("/todo");
      const heading = page.locator("h1");
      await expect(heading).toContainText("@");

      // Find and click the logout button
      const logoutButton = page.locator('button:has-text("Đăng xuất")');
      await expect(logoutButton).toBeVisible();
      await logoutButton.click();

      // Should redirect to /login after logout
      await page.waitForURL("/login", { timeout: 5000 });
      expect(page.url()).toContain("/login");

      // Verify logout was effective: try to go to /todo, should redirect back to /login
      // (session cookie was cleared by the logout action)
      await page.goto("/todo");
      await page.waitForURL("/login", { timeout: 5000 });
      expect(page.url()).toContain("/login");
    });
  });
});
