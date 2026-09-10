import { test, expect } from "@playwright/test";

import { supabaseReachable } from "./helpers/supabase-reachable";

test.describe("Awards page chrome (CI-safe)", () => {
  // Ensure no auth cookies for unauthenticated tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[TC ID-0] Anonymous visitor can load /awards and sees the h1 (public, replaces ID-1 redirect)", async ({
    page,
  }) => {
    // The /awards page is PUBLIC (per docs/vi/system/permissions.md:54).
    // TC ID-1's login-redirect assertion is deliberately superseded by architecture decision.
    // See clarifications.md § Decisions for rationale.
    await page.goto("/awards");
    expect(page.url()).toContain("/awards");

    // Verify page loaded successfully with h1
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Hệ thống giải thưởng SAA 2025");
  });

  test("[TC ID-4] Title and caption text rendered correctly", async ({
    page,
  }) => {
    await page.goto("/awards");

    // Main h1 title
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Hệ thống giải thưởng SAA 2025");

    // Caption text above h1 — TC ID-4 requires "small; muted", not just
    // present (phase 09, gap 6). `text-sm` = 14px / 400 weight at the
    // repo's default root font size.
    const caption = page.locator("text=Sun* Annual Awards 2025");
    await expect(caption).toBeVisible();
    await expect(caption).toHaveCSS("font-size", "14px");
    await expect(caption).toHaveCSS("font-weight", "400");
  });

  test("[TC ID-2] Clicking the header nav link reaches /awards", async ({
    page,
  }) => {
    // href-based locator, not label text: the header nav label is owned by
    // phase 07 and may not be merged yet (phase 09 § Key Insights).
    await page.goto("/");
    await page.locator('header a[href="/awards"]').click();

    await expect(page).toHaveURL(/\/awards/);
    await expect(page.locator("h1")).toContainText(
      "Hệ thống giải thưởng SAA 2025",
    );
  });

  test("[TC ID-8] Kudos block renders heading and /kudos link", async ({
    page,
  }) => {
    await page.goto("/awards");

    // Verify "Sun* Kudos" heading
    const kudosHeading = page.getByRole("heading", { name: "Sun* Kudos" });
    await expect(kudosHeading).toBeVisible();

    // Verify link to /kudos via aria-label to scope to the Kudos section CTA specifically.
    // Multiple /kudos links exist in the page (header nav, footer), so we use the aria-label
    // from the Kudos section block to avoid strict-mode violation.
    const kudosLink = page.getByLabel("Chi tiết Sun* Kudos");
    await expect(kudosLink).toBeVisible();
  });

  test("[TC ID-12] Clicking Sun* Kudos 'Chi tiết' opens /kudos", async ({
    page,
  }) => {
    // Deferred until /kudos existed (phase-05/06 era); it exists now
    // (`src/app/(public)/kudos/page.tsx`) — closes out audit gap 14.
    await page.goto("/awards");

    await page.getByLabel("Chi tiết Sun* Kudos").click();

    await expect(page).toHaveURL(/\/kudos/);
  });

  test("[TC ID-13] No uncaught JS console errors on page load", async ({
    page,
  }) => {
    // Collect console errors — register listener BEFORE navigation to catch errors during load
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto("/awards");

    // Wait for page to fully load
    await page.waitForLoadState("domcontentloaded");

    // Verify no errors were logged
    expect(consoleErrors).toHaveLength(0);
  });

  test("[TC NEW] Page renders 200 with header/h1/footer chrome and no console errors", async ({
    page,
  }) => {
    // Verify the page chrome (header, h1, footer) always loads and does not 500,
    // even when Supabase is unreachable (as in CI) or unavailable. This test is
    // CI-safe because it asserts only the invariant elements that render regardless
    // of whether award data is present. Register pageerror listener BEFORE navigation
    // to catch load-time errors.
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto("/awards");

    // Verify page loaded with 200 status
    expect(page.url()).toContain("/awards");

    // Verify header chrome is present (always rendered)
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Verify h1 is present (always rendered)
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Hệ thống giải thưởng SAA 2025");

    // Verify footer is present (always rendered)
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    // Verify no console errors during load (catches both success and error states)
    await page.waitForLoadState("domcontentloaded");
    expect(consoleErrors).toHaveLength(0);
  });

  test("[TC NEW] Supabase unreachable: chrome renders, zero award sections, no category nav", async ({
    page,
  }) => {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
    const isReachable = await supabaseReachable(supabaseUrl);

    // Same inversion as login.spec.ts's outage tests: this asserts the OUTAGE
    // contract, so a reachable Supabase is what makes it meaningless. Skips on a
    // dev machine when Supabase is up; always runs in CI, where Supabase is
    // unreachable and this is the only test proving /awards degrades instead of
    // 500-ing. `getAwards` runs server-side, so `page.route()` cannot fake the
    // outage — real reachability is the only honest signal.
    // eslint-disable-next-line playwright/no-skipped-test
    test.skip(
      !process.env.CI && isReachable,
      "Supabase is up — outage path not applicable",
    );

    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto("/awards");

    // Fail-open, not fail-closed: the page still serves its chrome.
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("h1")).toContainText(
      "Hệ thống giải thưởng SAA 2025",
    );
    await expect(page.locator("footer")).toBeVisible();

    // The actual outage contract: no award data means no award sections...
    for (const slug of [
      "top-talent",
      "top-project",
      "top-project-leader",
      "best-manager",
      "signature-2025-creator",
      "mvp",
    ]) {
      await expect(page.locator(`section#${slug}`)).toHaveCount(0);
    }

    // ...and no category nav at all, rather than an empty one. An empty
    // <nav> with no links is an a11y smell, so its ABSENCE is the contract.
    await expect(
      page.locator('nav[aria-label="Danh mục giải thưởng"]'),
    ).toHaveCount(0);

    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe("Awards content", { tag: "@local-db" }, () => {
  // Ensure no auth cookies for unauthenticated tests
  test.use({ storageState: { cookies: [], origins: [] } });

  test("[TC ID-3] Overall page structure: header, h1, nav, 6 sections, kudos, footer in document order", async ({
    page,
  }) => {
    await page.goto("/awards");

    // Verify header exists
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Verify h1
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Hệ thống giải thưởng SAA 2025");

    // Verify main navigation with aria-label
    const nav = page.locator('nav[aria-label="Danh mục giải thưởng"]');
    await expect(nav).toBeVisible();

    // Verify 6 award sections exist with matching ids
    const expectedSectionIds = [
      "top-talent",
      "top-project",
      "top-project-leader",
      "best-manager",
      "signature-2025-creator",
      "mvp",
    ];

    for (const sectionId of expectedSectionIds) {
      const section = page.locator(`section#${sectionId}`);
      await expect(section).toBeVisible();
    }

    // Verify Kudos block heading
    const kudosHeading = page.getByRole("heading", { name: "Sun* Kudos" });
    await expect(kudosHeading).toBeVisible();

    // Verify footer exists
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("[TC ID-5] Navigation lists exactly 6 items with correct hrefs in order", async ({
    page,
  }) => {
    await page.goto("/awards");

    const nav = page.locator('nav[aria-label="Danh mục giải thưởng"]');
    const navLinks = nav.locator("a");

    // Verify exactly 6 links
    await expect(navLinks).toHaveCount(6);

    // Expected links in order
    const expectedLinks = [
      { text: "Top Talent", href: "#top-talent" },
      { text: "Top Project", href: "#top-project" },
      { text: "Top Project Leader", href: "#top-project-leader" },
      { text: "Best Manager", href: "#best-manager" },
      { text: "Signature 2025 - Creator", href: "#signature-2025-creator" },
      { text: "MVP (Most Valuable Person)", href: "#mvp" },
    ];

    for (let i = 0; i < expectedLinks.length; i++) {
      const link = navLinks.nth(i);
      await expect(link).toHaveAttribute("href", expectedLinks[i].href);
      await expect(link).toContainText(expectedLinks[i].text);
    }
  });

  test("[TC ID-6] All 6 award sections render title, quantity, and prize value(s)", async ({
    page,
  }) => {
    await page.goto("/awards");

    const awards = [
      {
        sectionId: "top-talent",
        title: "Top Talent",
        quantity: "10",
        prizeValues: ["7.000.000 VNĐ"],
      },
      {
        sectionId: "top-project",
        title: "Top Project",
        quantity: "02",
        prizeValues: ["15.000.000 VNĐ"],
      },
      {
        sectionId: "top-project-leader",
        title: "Top Project Leader",
        quantity: "03",
        prizeValues: ["7.000.000 VNĐ"],
      },
      {
        sectionId: "best-manager",
        title: "Best Manager",
        quantity: "01",
        prizeValues: ["10.000.000 VNĐ"],
      },
      {
        sectionId: "signature-2025-creator",
        title: "Signature 2025 - Creator",
        quantity: "01",
        prizeValues: ["5.000.000 VNĐ", "8.000.000 VNĐ"],
      },
      {
        sectionId: "mvp",
        title: "MVP (Most Valuable Person)",
        quantity: "01",
        prizeValues: ["15.000.000 VNĐ"],
      },
    ];

    for (const award of awards) {
      const section = page.locator(`section#${award.sectionId}`);
      await expect(section).toBeVisible();

      // Verify h2 title
      const h2 = section.locator("h2");
      await expect(h2).toContainText(award.title);

      // Verify quantity is present
      await expect(section.locator(`text=${award.quantity}`)).toBeVisible();

      // Verify prize value(s)
      for (const prizeValue of award.prizeValues) {
        await expect(section.locator(`text=${prizeValue}`)).toBeVisible();
      }
    }
  });

  test("[TC ID-7] Every award section contains an image", async ({ page }) => {
    await page.goto("/awards");

    const expectedSectionIds = [
      "top-talent",
      "top-project",
      "top-project-leader",
      "best-manager",
      "signature-2025-creator",
      "mvp",
    ];

    for (const sectionId of expectedSectionIds) {
      const section = page.locator(`section#${sectionId}`);
      const image = section.locator("img");
      // Award graphics per award-seed-content.md are TWO layers:
      // (1) /home/Award_BG.png (ring background), (2) per-slug name PNG
      // So each section has 2 images. Verify count and then check first is visible.
      await expect(image).toHaveCount(2);
      await expect(image.first()).toBeVisible();
    }
  });

  test("[TC ID-9] Clicking each nav item scrolls the matching section into view and shows the gold underline", async ({
    page,
  }) => {
    // Desktop width so the `lg` breakpoint is active — rows C/C.1–C.6 +
    // TC ID-9 require the underline indicator AT `lg` too, not just below it
    // (phase 09, gap 7).
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/awards");

    const navLinks = [
      { href: "#top-talent", sectionId: "top-talent" },
      { href: "#top-project", sectionId: "top-project" },
      { href: "#top-project-leader", sectionId: "top-project-leader" },
      { href: "#best-manager", sectionId: "best-manager" },
      { href: "#signature-2025-creator", sectionId: "signature-2025-creator" },
      { href: "#mvp", sectionId: "mvp" },
    ];

    for (const link of navLinks) {
      const navLink = page.locator(`a[href="${link.href}"]`);
      await navLink.click();

      // Verify section is in viewport (or close to it)
      const section = page.locator(`section#${link.sectionId}`);
      await expect(section).toBeInViewport({ ratio: 0.5 });

      // Active indicator is the gold underline, even at `lg` (not a left
      // border) — asserts the actual rendered border, not just the class.
      await expect(navLink).toHaveCSS("border-bottom-width", "1px");
    }
  });

  test("[TC ID-11] After clicking a nav item, exactly one nav link has aria-current=true and it is the clicked one", async ({
    page,
  }) => {
    await page.goto("/awards");

    const navLinks = [
      { href: "#top-talent", sectionId: "top-talent" },
      { href: "#top-project", sectionId: "top-project" },
      { href: "#top-project-leader", sectionId: "top-project-leader" },
      { href: "#best-manager", sectionId: "best-manager" },
      { href: "#signature-2025-creator", sectionId: "signature-2025-creator" },
      { href: "#mvp", sectionId: "mvp" },
    ];

    for (const linkData of navLinks) {
      const navLink = page.locator(`a[href="${linkData.href}"]`);
      await navLink.click();

      // Verify exactly one nav link has aria-current="true"
      const activeLinks = page.locator(
        'nav[aria-label="Danh mục giải thưởng"] a[aria-current="true"]',
      );
      await expect(activeLinks).toHaveCount(1);

      // Verify the clicked link is the active one
      await expect(navLink).toHaveAttribute("aria-current", "true");
    }
  });

  test("[TC ID-10] Hovering the currently-active nav item still highlights", async ({
    page,
  }) => {
    // `hover:bg-white/10` used to live only on the inactive-item class, so
    // the active item stopped responding to the pointer (phase 09, gap 8).
    await page.goto("/awards");

    const activeLink = page.locator(
      'nav[aria-label="Danh mục giải thưởng"] a[aria-current="true"]',
    );
    await expect(activeLink).toHaveCount(1);

    const beforeHover = await activeLink.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );

    await activeLink.hover();

    await expect(async () => {
      const afterHover = await activeLink.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      );
      expect(afterHover).not.toBe(beforeHover);
    }).toPass();
  });

  test("[REG 2026-09-07] English locale renders award content, not the empty state", async ({
    page,
    context,
  }) => {
    // `getAwards` filters on the viewer's locale. While `public.awards` held
    // vi-only rows, switching the site to English returned zero rows and the
    // page fell back to its empty state — a blank page, while `/` still listed
    // all six awards from `messages/en.json`. Nothing in this suite caught it
    // because every other test runs at the default locale.
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "en",
        url: "http://localhost:3000",
      },
    ]);

    await page.goto("/awards");

    await expect(page.locator("section[id]")).toHaveCount(6);
    await expect(
      page.getByText("No award information available yet."),
    ).toBeHidden();

    // English copy, not the Vietnamese fallback.
    await expect(
      page.locator("section#top-talent").getByText(/The Top Talent award/),
    ).toBeVisible();

    // Amounts are re-formatted for English: comma thousands, "VND" not "VNĐ".
    await expect(
      page.locator("section#mvp").getByText("15,000,000 VND"),
    ).toBeVisible();
  });
});
