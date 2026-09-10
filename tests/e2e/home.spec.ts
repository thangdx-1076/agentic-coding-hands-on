import * as fs from "fs";
import * as path from "path";

import { test, expect } from "@playwright/test";

import {
  createTestSession,
  generateSupabaseCookies,
  injectSupabaseSession,
} from "./helpers/sign-in";
import { promoteToAdmin } from "./helpers/promote-to-admin";

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

test.describe("Homepage SAA", () => {
  test.describe("Unauthenticated User", () => {
    // Ensure no auth cookies for unauthenticated tests
    test.use({ storageState: { cookies: [], origins: [] } });

    test("[TC ID-0] Unauthenticated user can access public homepage", async ({
      page,
    }) => {
      await page.goto("/");
      expect(new URL(page.url()).pathname).toBe("/");
      // Verify page loaded successfully
      const h1 = page.locator("h1");
      await expect(h1).toContainText("ROOT FURTHER");
    });

    test("[TC ID-8] Header logo position and alt text", async ({ page }) => {
      await page.goto("/");
      const logo = page.locator('header img[alt="Sun* Annual Awards 2025"]');
      await expect(logo).toBeVisible();
      const box = await logo.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.y).toBeLessThan(100); // Top of page
      // Spec A1.1 / TC ID-8: logo box is 64x60. Round to dodge sub-pixel
      // noise from transforms; not hovered here, so no hover-scale drift.
      expect(Math.round(box!.width)).toBe(64);
      expect(Math.round(box!.height)).toBe(60);
    });

    test("[TC ID-9] Navigation link 'About SAA 2025' active state", async ({
      page,
    }) => {
      await page.goto("/");
      // Scope to header to avoid matching footer link
      const aboutLink = page
        .locator("header")
        .locator('a[href="/"]')
        .filter({ hasText: "About SAA 2025" });
      await expect(aboutLink).toHaveAttribute("aria-current", "page");
    });

    test("[TC ID-10] Language selector shows 'VN' by default", async ({
      page,
    }) => {
      await page.goto("/");
      const langSelector = page.locator('header button[aria-haspopup="menu"]');
      await expect(langSelector).toBeVisible();
      const text = await langSelector.textContent();
      expect(text).toContain("VN");
    });

    test("[TC ID-1 anon variant] Anonymous user sees login link, no bell", async ({
      page,
    }) => {
      await page.goto("/");
      // Should have login link with aria-label
      const loginLink = page.locator('a[aria-label="Đăng nhập"]');
      await expect(loginLink).toBeVisible();
      await expect(loginLink).toHaveAttribute("href", "/login");
      // Should NOT have notification bell
      const bell = page.locator('button[aria-label*="Thông báo"]');
      await expect(bell).toBeHidden();
    });

    test("[TC ID-12, ID-13] Hero section with countdown timer and 'Coming soon' label", async ({
      page,
    }) => {
      await page.goto("/");
      // h1 ROOT FURTHER
      const h1 = page.locator("h1");
      await expect(h1).toContainText("ROOT FURTHER");

      // "Coming soon" label should be visible before event
      const comingSoon = page.locator("text=Coming soon");
      await expect(comingSoon).toBeVisible();

      // Countdown should have 3 units with proper labels
      const daysLabel = page.locator("text=DAYS");
      const hoursLabel = page.locator("text=HOURS");
      const minutesLabel = page.locator("text=MINUTES");

      await expect(daysLabel).toBeVisible();
      await expect(hoursLabel).toBeVisible();
      await expect(minutesLabel).toBeVisible();

      // Each unit should display a value matching /^\d{2,}$/
      // Note: tile structure assumes each tile has digits element as direct child of timer
      const countdownValues = page
        .locator("[role=timer]")
        .getByText(/^\d{2,}$/);
      await expect(countdownValues).toHaveCount(3);

      // [TC ID-12 ext] Each unit is 1 [data-testid='tile-digit'] box PER
      // CHARACTER (min 2, no cap) inside the [data-testid='tile-digits']
      // wrapper — not a single merged text node. Verified generically by
      // wrapper string length so it holds for both a 2-digit unit
      // (HOURS/MINUTES) and DAYS, which is 5 digits under the fixed
      // EVENT_START_AT=2099-12-31 e2e env (pad2 never clamps days).
      const tiles = page.locator("[data-testid='tile']");
      for (let i = 0; i < 3; i++) {
        const digitsWrapper = tiles
          .nth(i)
          .locator("[data-testid='tile-digits']");
        const wrapperText = (await digitsWrapper.textContent())?.trim() ?? "";
        const digitBoxes = digitsWrapper.locator("[data-testid='tile-digit']");

        await expect(digitBoxes).toHaveCount(wrapperText.length);
        expect(wrapperText.length).toBeGreaterThanOrEqual(2);
      }
    });

    test("[TC ID-24, ID-39] Countdown decreases by 1 minute after 1 minute passes", async ({
      page,
    }) => {
      // Install clock BEFORE goto with fixed time 1h 30m before EVENT_START_AT (2099-12-31T18:30:00+07:00)
      // 17:00 → 18:30 = 1 hour 30 minutes remaining = 01:30:00
      // Countdown renders as 01 hours, 29 minutes remaining (within current hour)
      await page.clock.install({ time: new Date("2099-12-31T17:00:00+07:00") });

      await page.goto("/");

      // Use auto-retrying expectations (toHaveText) which wait for hydration
      const minutesTile = page
        .locator("text=MINUTES")
        .locator("..")
        .getByText(/^\d{2,}$/);

      // Verify initial state: 29 minutes remaining
      await expect(minutesTile.first()).toHaveText("29");
      const hoursTile = page
        .locator("text=HOURS")
        .locator("..")
        .getByText(/^\d{2,}$/);
      await expect(hoursTile.first()).toHaveText("01");

      // Fast-forward 1 minute
      await page.clock.fastForward("00:01:00");

      // Verify minutes decreased to 28 (and hours still 01)
      await expect(minutesTile.first()).toHaveText("28");
      await expect(hoursTile.first()).toHaveText("01");
    });

    test("[TC ID-14] Event information text visible", async ({ page }) => {
      await page.goto("/");
      // Check for event time
      await expect(page.locator("text=Thời gian: 18h30")).toBeVisible();
      // Check for venue
      await expect(
        page.locator("text=Nhà hát nghệ thuật quân đội"),
      ).toBeVisible();
      // Check for livestream info
      await expect(
        page.locator(
          "text=Tường thuật trực tiếp tại Group Facebook Sun* Family",
        ),
      ).toBeVisible();
    });

    test("[TC ID-44] CTA 'ABOUT AWARDS' link navigates to /awards", async ({
      page,
    }) => {
      await page.goto("/");
      const awardsCtaLink = page
        .locator("a")
        .filter({ hasText: /ABOUT AWARDS/i });
      await expect(awardsCtaLink).toHaveAttribute("href", "/awards");
    });

    test("[TC ID-45] CTA 'ABOUT KUDOS' link navigates to /kudos", async ({
      page,
    }) => {
      await page.goto("/");
      const kudosCtaLink = page
        .locator("a")
        .filter({ hasText: /ABOUT KUDOS/i });
      await expect(kudosCtaLink).toHaveAttribute("href", "/kudos");
    });

    test("[TC ID-15] Award cards display in 3-column grid on desktop (≥1024px)", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/");

      // Find all award cards
      const cards = page.locator("a").filter({
        hasText:
          /Top Talent|Top Project|Top Project Leader|Best Manager|Signature 2025|MVP/,
      });
      await expect(cards).toHaveCount(6);

      // Get bounding boxes to verify 3-column layout
      const boxes = await cards.evaluateAll((elements) =>
        elements.map((el) => {
          const rect = el.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width };
        }),
      );

      // Group by row (cards with similar y coordinates are in same row)
      const rows: number[][] = [];
      boxes.forEach((box, idx) => {
        const existingRow = rows.find(
          (row) => Math.abs(box.y - boxes[row[0]].y) < 50,
        );
        if (existingRow) {
          existingRow.push(idx);
        } else {
          rows.push([idx]);
        }
      });

      // For 3-column layout, first row should have 3 columns
      expect(rows[0]).toHaveLength(3);
    });

    test("[TC ID-16] Award cards display in 2-column grid on mobile (<768px)", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");

      const cards = page.locator("a").filter({
        hasText:
          /Top Talent|Top Project|Top Project Leader|Best Manager|Signature 2025|MVP/,
      });
      await expect(cards).toHaveCount(6);

      // Get bounding boxes
      const boxes = await cards.evaluateAll((elements) =>
        elements.map((el) => {
          const rect = el.getBoundingClientRect();
          return { x: rect.x, y: rect.y };
        }),
      );

      // Group by row
      const rows: number[][] = [];
      boxes.forEach((box, idx) => {
        const existingRow = rows.find(
          (row) => Math.abs(box.y - boxes[row[0]].y) < 50,
        );
        if (existingRow) {
          existingRow.push(idx);
        } else {
          rows.push([idx]);
        }
      });

      // For 2-column layout, rows should have 2 columns
      for (const row of rows) {
        expect(row.length).toBeLessThanOrEqual(2);
      }
    });

    test("[TC C1] Awards section renders the description line under the heading", async ({
      page,
    }) => {
      await page.goto("/");
      await expect(
        page.locator(
          "text=Các hạng mục sẽ được trao giải theo TOP những người xuất sắc nhất.",
        ),
      ).toBeVisible();
    });

    test("[TC ID-47, ID-48, ID-49, ID-50] Award cards link to /awards with proper slugs", async ({
      page,
    }) => {
      await page.goto("/");

      // Verify each award card has correct links with hashtags
      const awards = [
        { title: "Top Talent", slug: "top-talent" },
        { title: "Top Project", slug: "top-project" },
        { title: "Top Project Leader", slug: "top-project-leader" },
        { title: "Best Manager", slug: "best-manager" },
        { title: "Signature 2025 - Creator", slug: "signature-2025-creator" },
        { title: "MVP (Most Valuable Person)", slug: "mvp" },
      ];

      for (const award of awards) {
        // Find the "Chi tiết" link for this award
        const detailsLink = page
          .locator(`a[aria-label*="Chi tiết"][aria-label*="${award.title}"]`)
          .first();
        await expect(detailsLink).toHaveAttribute(
          "href",
          `/awards#${award.slug}`,
        );
      }
    });

    test("[TC ID-53] Kudos section with 'Chi tiết' link to /kudos", async ({
      page,
    }) => {
      await page.goto("/");
      // Check heading "Sun* Kudos" using getByRole to scope to the section heading
      const kudosHeading = page.getByRole("heading", { name: "Sun* Kudos" });
      await expect(kudosHeading).toBeVisible();

      // Check "Chi tiết" link
      const kudosDetailLink = page.locator(
        'a[aria-label*="Chi tiết Sun* Kudos"]',
      );
      await expect(kudosDetailLink).toHaveAttribute("href", "/kudos");
    });

    test("[TC ID-30, ID-31, ID-32, ID-33, ID-34, ID-35] Widget button menu keyboard and click behavior", async ({
      page,
    }) => {
      await page.goto("/");
      const widgetButton = page.locator('button[aria-label="Hành động nhanh"]');
      const menu = page.locator('[role="menu"]');

      // Test click to open
      await widgetButton.click();
      await expect(menu).toBeVisible();

      // Test click to close
      await widgetButton.click();
      await expect(menu).toBeHidden();

      // Test click outside to close
      await widgetButton.click();
      await expect(menu).toBeVisible();
      await page.locator("main").click({ position: { x: 100, y: 100 } });
      await expect(menu).toBeHidden();

      // Test Escape to close (TC ID-35)
      // Menu's useMenuKeyboardNav hook moves focus into first menuitem;
      // Escape from menuitem closes menu and returns focus to trigger
      await widgetButton.click();
      await expect(menu).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      // Verify focus returned to the trigger
      await expect(widgetButton).toBeFocused();

      // Test Enter/Space to open
      await widgetButton.focus();
      await widgetButton.press("Enter");
      await expect(menu).toBeVisible();
    });

    test("[TC ID-17] Footer content and links", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Check footer logo link
      const footerLogo = page.locator(
        'footer img[alt="Sun* Annual Awards 2025"]',
      );
      await expect(footerLogo).toBeVisible();

      // Check navigation links
      const aboutLink = page
        .locator('footer a[href="/"]')
        .filter({ hasText: "About SAA 2025" });
      const awardsLink = page.locator('footer a[href="/awards"]');
      const kudosLink = page.locator('footer a[href="/kudos"]');
      const standardsLink = page.locator('footer a[href="/standards"]');

      await expect(aboutLink).toBeVisible();
      await expect(awardsLink).toBeVisible();
      await expect(kudosLink).toBeVisible();
      await expect(standardsLink).toBeVisible();

      // Check copyright text
      const copyright = page.locator("text=Bản quyền thuộc về Sun* © 2025");
      await expect(copyright).toBeVisible();
    });

    test("[TC ID-25, ID-26] Language switch to EN and back to VN", async ({
      page,
    }) => {
      await page.goto("/");

      // Open language selector
      let langSelector = page.locator('header button[aria-haspopup="menu"]');
      await langSelector.click();

      // Select EN
      const enOption = page
        .locator('[role="menuitem"]')
        .filter({ hasText: /^EN$/ });
      await enOption.click();

      // Verify language changed
      await expect(page.locator("text=Copyright © Sun* 2025")).toBeVisible();
      // Use getByRole to get the first "Details" link (multiple exist after lang switch)
      await expect(
        page.getByRole("link", { name: "Details" }).first(),
      ).toBeVisible();
      langSelector = page.locator('header button[aria-haspopup="menu"]');
      await expect(langSelector).toContainText("EN");

      // Switch back to VN
      langSelector = page.locator('header button[aria-haspopup="menu"]');
      await langSelector.click();
      const vnOption = page
        .locator('[role="menuitem"]')
        .filter({ hasText: /^VN$/ });
      await vnOption.click();

      // Verify language changed back
      await expect(
        page.locator("text=Bản quyền thuộc về Sun* © 2025"),
      ).toBeVisible();
      langSelector = page.locator('header button[aria-haspopup="menu"]');
      await expect(langSelector).toContainText("VN");
    });

    test("[TC ID-41, ID-42] Zero-state countdown when event time reached", async ({
      page,
    }) => {
      // Install clock with time 30s before EVENT_START_AT (2099-12-31T18:30:00+07:00)
      await page.clock.install({ time: new Date("2099-12-31T18:29:30+07:00") });

      await page.goto("/");

      // Use auto-retrying expectations which wait for hydration
      // Verify "Coming soon" is still visible before the event (30s remaining)
      await expect(page.locator("text=Coming soon")).toBeVisible();

      // Fast-forward past the event time (adds 1 minute, crosses 18:30:00)
      await page.clock.fastForward("00:01:00");

      // After crossing the event time, "Coming soon" should be hidden
      await expect(page.locator("text=Coming soon")).toBeHidden();

      // Countdown should show 00 00 00 (zero-state after event)
      const timerDigits = page.locator("[role=timer]").getByText(/^\d{2,}$/);
      await expect(timerDigits.first()).toHaveText("00");
      await expect(timerDigits.nth(1)).toHaveText("00");
      await expect(timerDigits.nth(2)).toHaveText("00");

      // "Coming soon" label should be hidden
      const comingSoonAfter = page.locator("text=Coming soon");
      await expect(comingSoonAfter).toBeHidden();
    });

    test("[TC ID-2] Clicking header logo navigates to homepage and scrolls to top", async ({
      page,
    }) => {
      await page.goto("/awards"); // Navigate to different page (will 404, but URL changes)
      // Fallback: just load homepage and scroll down
      await page.goto("/");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Click logo
      const headerLogo = page.locator(
        'header a[aria-label="Sun* Annual Awards 2025"]',
      );
      await headerLogo.click();

      // Should be on homepage
      expect(new URL(page.url()).pathname).toBe("/");

      // Should be scrolled to top
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeLessThan(50);
    });

    test("[TC ID-3] Clicking 'About SAA 2025' in header stays on homepage", async ({
      page,
    }) => {
      await page.goto("/");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const aboutLink = page
        .locator('header a[href="/"]')
        .filter({ hasText: "About SAA 2025" });
      await aboutLink.click();

      // Should stay on homepage
      expect(new URL(page.url()).pathname).toBe("/");

      // Should be scrolled back to top, like TC ID-2's logo click
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeLessThan(50);
    });

    // Both nav-click tests below are `@local-db`, unlike the rest of this
    // describe. Clicking a header link is a client-side RSC navigation, and
    // both `/awards` and `/kudos` are Server Components that read Supabase.
    // With Supabase unreachable the RSC fetch fails, Next ABORTS the
    // navigation, and the URL stays at `/` — so `toHaveURL` times out rather
    // than catching a real defect. Measured 2026-09-10 in CI and reproduced
    // locally with `CI=1 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:59999`.
    // A full `page.goto()` to either route still degrades gracefully; it is
    // only client-side navigation that needs the database, so the tag is a
    // statement about the environment, not a weakened assertion.
    test(
      "[TC ID-21] Clicking 'Awards Information' in header navigates to /awards",
      { tag: "@local-db" },
      async ({ page }) => {
        await page.goto("/");
        const awardsLink = page
          .locator("header")
          .locator('a[href="/awards"]')
          .filter({ hasText: "Awards Information" });
        await awardsLink.click();
        await expect(page).toHaveURL(/\/awards/);
      },
    );

    test(
      "[TC ID-22] Clicking 'Sun* Kudos' in header navigates to /kudos",
      { tag: "@local-db" },
      async ({ page }) => {
        await page.goto("/");
        const kudosLink = page
          .locator("header")
          .locator('a[href="/kudos"]')
          .filter({ hasText: "Sun* Kudos" });
        await kudosLink.click();
        await expect(page).toHaveURL(/\/kudos/);
      },
    );
  });

  test.describe("Authenticated Member User", () => {
    test.beforeEach(async ({ context }) => {
      // Create authenticated session for a member user
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const memberEmail = "e2e-home-member@example.com";
      const password = "Test@123456789";

      if (!supabaseUrl || !publishableKey) {
        throw new Error("Supabase environment variables not set");
      }

      const session = await createTestSession(
        supabaseUrl,
        publishableKey,
        memberEmail,
        password,
      );
      const cookies = await generateSupabaseCookies(
        supabaseUrl,
        publishableKey,
        session.access_token,
        session.refresh_token,
      );

      await injectSupabaseSession(context, cookies);
    });

    test("@auth [TC ID-1] Authenticated member user sees notification bell and account menu", async ({
      page,
    }) => {
      await page.goto("/");

      // Should have notification bell
      const bell = page.locator('button[aria-label="Thông báo"]');
      await expect(bell).toBeVisible();

      // Should have account button
      const accountBtn = page.locator('button[aria-label="Tài khoản"]');
      await expect(accountBtn).toBeVisible();

      // Login link should not be visible
      const loginLink = page.locator('a[aria-label="Đăng nhập"]');
      await expect(loginLink).toBeHidden();
    });

    test("@auth [TC ID-29] Notification bell has no badge when no unread notifications", async ({
      page,
    }) => {
      await page.goto("/");

      const bell = page.locator('button[aria-label="Thông báo"]');
      await expect(bell).toBeVisible();

      // Open notification panel
      await bell.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Should show "Bạn chưa có thông báo"
      await expect(dialog).toContainText("Bạn chưa có thông báo");

      // No badge element should exist
      const badge = dialog.locator("[data-unread]");
      await expect(badge).toBeHidden();
    });

    test("@auth [TC ID-36, ID-38] Account menu displays correct options for member user", async ({
      page,
    }) => {
      await page.goto("/");

      const accountBtn = page.locator('button[aria-label="Tài khoản"]');
      await accountBtn.click();

      const menu = page.locator('[role="menu"]');
      await expect(menu).toBeVisible();

      // Should have "Hồ sơ" option (a[role="menuitem"])
      const profileMenuItem = menu
        .locator('[role="menuitem"]')
        .filter({ hasText: "Hồ sơ" });
      await expect(profileMenuItem).toBeVisible();
      await expect(profileMenuItem).toHaveAttribute("href", "/profile");

      // Should have "Đăng xuất" option
      const logoutMenuItem = menu
        .locator('[role="menuitem"]')
        .filter({ hasText: "Đăng xuất" });
      await expect(logoutMenuItem).toBeVisible();

      // Should NOT have "Trang quản trị" option
      const adminMenuItem = menu
        .locator('[role="menuitem"]')
        .filter({ hasText: "Trang quản trị" });
      await expect(adminMenuItem).toBeHidden();
    });

    test("@auth [TC ID-4] Logout button submits and redirects to /login", async ({
      page,
    }) => {
      await page.goto("/");

      const accountBtn = page.locator('button[aria-label="Tài khoản"]');
      await accountBtn.click();

      const menu = page.locator('[role="menu"]');
      const logoutMenuItem = menu
        .locator('[role="menuitem"]')
        .filter({ hasText: "Đăng xuất" });

      await logoutMenuItem.click();

      // Should redirect to login
      await page.waitForURL("/login", { timeout: 5000 });
      expect(page.url()).toContain("/login");
    });
  });

  test.describe("Authenticated Admin User", () => {
    test.beforeEach(async ({ context }) => {
      // Create authenticated session for an admin user
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const adminEmail = "e2e-home-admin@example.com";
      const password = "Test@123456789";

      if (!supabaseUrl || !publishableKey) {
        throw new Error("Supabase environment variables not set");
      }

      const session = await createTestSession(
        supabaseUrl,
        publishableKey,
        adminEmail,
        password,
      );
      const cookies = await generateSupabaseCookies(
        supabaseUrl,
        publishableKey,
        session.access_token,
        session.refresh_token,
      );

      await injectSupabaseSession(context, cookies);

      // Promote user to admin
      promoteToAdmin(adminEmail);
    });

    test("@auth [TC ID-5, ID-37] Account menu displays admin dashboard option for admin user", async ({
      page,
    }) => {
      await page.goto("/");

      const accountBtn = page.locator('button[aria-label="Tài khoản"]');
      await accountBtn.click();

      const menu = page.locator('[role="menu"]');
      await expect(menu).toBeVisible();

      // Should have "Hồ sơ" option
      const profileMenuItem = menu
        .locator('[role="menuitem"]')
        .filter({ hasText: "Hồ sơ" });
      await expect(profileMenuItem).toBeVisible();

      // Should have "Trang quản trị" option - admin only (a[role="menuitem"])
      const adminMenuItem = menu
        .locator('[role="menuitem"]')
        .filter({ hasText: "Trang quản trị" });
      await expect(adminMenuItem).toBeVisible();
      await expect(adminMenuItem).toHaveAttribute("href", "/admin");

      // Should have "Đăng xuất" option
      const logoutMenuItem = menu
        .locator('[role="menuitem"]')
        .filter({ hasText: "Đăng xuất" });
      await expect(logoutMenuItem).toBeVisible();
    });
  });

  test.describe("Authentication Guards", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("[TC f62b0c97] Unauthenticated user accessing /login is not redirected", async ({
      page,
    }) => {
      await page.goto("/login");
      // /login should remain /login for unauthenticated users
      expect(page.url()).toContain("/login");
    });

    test("@auth [TC f62b0c97 new] Authenticated user accessing /login redirects to /", async ({
      context,
    }) => {
      // Create authenticated session
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const publishableKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
      const testEmail = "e2e-home-login-redirect@example.com";
      const password = "Test@123456789";

      const session = await createTestSession(
        supabaseUrl,
        publishableKey,
        testEmail,
        password,
      );
      const cookies = await generateSupabaseCookies(
        supabaseUrl,
        publishableKey,
        session.access_token,
        session.refresh_token,
      );

      await injectSupabaseSession(context, cookies);

      const page = await context.newPage();
      await page.goto("/login");

      // Should redirect to homepage
      await page.waitForURL("/", { timeout: 5000 });
      expect(new URL(page.url()).pathname).toBe("/");
    });
  });
});
