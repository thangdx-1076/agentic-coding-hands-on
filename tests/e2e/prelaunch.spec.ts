import { test, expect } from "@playwright/test";

/**
 * E2E tests for Countdown Prelaunch Page (/prelaunch)
 * ======================================================
 *
 * Durable screen-level E2E spec for the Countdown Prelaunch feature.
 * Policy: e2e-red-first. Tests FAIL now because feature is unimplemented;
 * they PASS once the route and UI are complete.
 *
 * Test-case matrix (C1..C6):
 * - C1: GET /prelaunch responds 200 (FR-101, SC-003)
 * - C2: Title "Sự kiện sẽ bắt đầu sau" visible (FR-202, vi locale default)
 * - C3: Timer with 3 tiles, correct labels DAYS/HOURS/MINUTES (FR-203/204)
 * - C4: No <header>, no <footer>, exactly 1 background image with aria-hidden (FR-201)
 * - C5: Network idle after load, no extra requests (FR-401, optional—skip if flaky)
 * - C6: Default OFF lock: routes /, /awards, /standards, /login, /kudos do NOT redirect (BR-001)
 *
 * MoMorph screen: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU
 * Integration contract: plan.md § "Integration contract"
 */

test.describe("Countdown Prelaunch Page (/prelaunch)", () => {
  // Anonymous user — no auth required
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[C1] GET /prelaunch responds 200 (NOT 404), path set correctly", async ({
    page,
  }) => {
    // RED: Route doesn't exist yet → 404 response
    // ASSERTION: expect(res?.status()).toBe(200)
    const res = await page.goto("/prelaunch");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/prelaunch$/);
  });

  test("[C2] Title text 'Sự kiện sẽ bắt đầu sau' is visible (vi locale default)", async ({
    page,
  }) => {
    // RED: Route missing → element not found
    // ASSERTION: page should render with correct i18n title
    await page.goto("/prelaunch");
    const title = page.getByText("Sự kiện sẽ bắt đầu sau");
    await expect(title).toBeVisible();
  });

  test("[C3] Timer: exactly 1 [role='timer'] with 3 tiles, correct labels DAYS/HOURS/MINUTES", async ({
    page,
  }) => {
    // RED: Timer component doesn't exist
    // ASSERTION: exactly 1 role=timer element with 3 labeled tiles
    await page.goto("/prelaunch");

    const timer = page.getByRole("timer");
    await expect(timer).toHaveCount(1);

    // Each tile must have:
    // - A digits element with textContent matching /^\d{2,}$/
    // - A label element
    const tiles = timer.locator("[data-testid='tile']");
    await expect(tiles).toHaveCount(3);

    // Check labels in DOM order: DAYS, HOURS, MINUTES
    const labels = timer.locator("[data-testid='tile-label']");
    await expect(labels).toHaveCount(3);

    const daysLabel = await labels.nth(0).textContent();
    const hoursLabel = await labels.nth(1).textContent();
    const minutesLabel = await labels.nth(2).textContent();

    expect(daysLabel?.trim()).toBe("DAYS");
    expect(hoursLabel?.trim()).toBe("HOURS");
    expect(minutesLabel?.trim()).toBe("MINUTES");

    // Check each tile has a digits element matching /^\d{2,}$/
    for (let i = 0; i < 3; i++) {
      const digitsElement = tiles.nth(i).locator("[data-testid='tile-digits']");
      const digitsText = await digitsElement.textContent();
      expect(digitsText).toMatch(/^\d{2,}$/);
    }
  });

  test("[C4] No <header>, no <footer>; exactly 1 background image with aria-hidden", async ({
    page,
  }) => {
    // RED: Page structure missing or wrong
    // ASSERTION: layout must be headerless/footerless with background image
    await page.goto("/prelaunch");

    const header = page.locator("header");
    const footer = page.locator("footer");
    const bgImage = page.locator('img[aria-hidden="true"]');

    await expect(header).toHaveCount(0);
    await expect(footer).toHaveCount(0);
    await expect(bgImage).toHaveCount(1);
  });

  test("[C5] The screen fetches no data — it is static plus a client tick (FR-401)", async ({
    page,
  }) => {
    // FR-401: the countdown runs entirely client-side off a server-seeded
    // timestamp, so the page must never poll. Asserted by URL shape rather
    // than by waiting out a quiet window: a fixed sleep proves nothing on a
    // fast machine and flakes on a slow one, whereas "no request that could
    // carry data was ever made" is exact and deterministic.
    const dataRequests: string[] = [];

    page.on("request", (req) => {
      const url = req.url();
      const isData =
        url.includes("/api/") ||
        url.includes("/auth/v1/") ||
        url.includes("/rest/v1/") ||
        /\.json(\?|$)/.test(url);

      if (isData) {
        dataRequests.push(url);
      }
    });

    await page.goto("/prelaunch");
    await expect(page.locator("[role='timer']")).toBeVisible();

    expect(dataRequests).toEqual([]);
  });

  test("[C6] Lock OFF (default): routes /, /awards, /standards, /login, /kudos do NOT redirect", async ({
    page,
  }) => {
    // RED: Routes either missing or incorrectly locked
    // ASSERTION: Each route loads at its correct path (lock is OFF by default)
    // NOTE: PRELAUNCH_LOCK_ENABLED is not set in playwright.config.ts, so lock is OFF
    const routes = ["/", "/awards", "/standards", "/login", "/kudos"];

    for (const route of routes) {
      await page.goto(route);
      // Should stay at the requested route, NOT redirect to /prelaunch
      await expect(page).toHaveURL(new RegExp(`${route}$`));
    }
  });
});
