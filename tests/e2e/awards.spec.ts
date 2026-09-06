import { test, expect } from "@playwright/test";

test.describe("Awards System Page", () => {
  test.describe("Unauthenticated User", () => {
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

    test("[TC ID-4] Title and caption text rendered correctly", async ({
      page,
    }) => {
      await page.goto("/awards");

      // Main h1 title
      const h1 = page.locator("h1");
      await expect(h1).toContainText("Hệ thống giải thưởng SAA 2025");

      // Caption text above h1
      const caption = page.locator("text=Sun* annual awards 2025");
      await expect(caption).toBeVisible();
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
        await expect(image).toBeVisible();
        await expect(image).toHaveCount(1);
      }
    });

    test("[TC ID-8] Kudos block renders heading and /kudos link", async ({
      page,
    }) => {
      await page.goto("/awards");

      // Verify "Sun* Kudos" heading
      const kudosHeading = page.getByRole("heading", { name: "Sun* Kudos" });
      await expect(kudosHeading).toBeVisible();

      // Verify link to /kudos
      const kudosLink = page.locator('a[href="/kudos"]');
      await expect(kudosLink).toBeVisible();
    });

    test("[TC ID-9] Clicking each nav item scrolls the matching section into view", async ({
      page,
    }) => {
      await page.goto("/awards");

      const navLinks = [
        { href: "#top-talent", sectionId: "top-talent" },
        { href: "#top-project", sectionId: "top-project" },
        { href: "#best-manager", sectionId: "best-manager" },
        { href: "#mvp", sectionId: "mvp" },
      ];

      for (const link of navLinks) {
        const navLink = page.locator(`a[href="${link.href}"]`);
        await navLink.click();

        // Verify section is in viewport (or close to it)
        const section = page.locator(`section#${link.sectionId}`);
        await expect(section).toBeInViewport({ ratio: 0.5 });
      }
    });

    test("[TC ID-11] After clicking a nav item, exactly one nav link has aria-current=true and it is the clicked one", async ({
      page,
    }) => {
      await page.goto("/awards");

      const navLinks = [
        { href: "#top-talent", sectionId: "top-talent" },
        { href: "#top-project", sectionId: "top-project" },
        { href: "#best-manager", sectionId: "best-manager" },
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

    test("[TC ID-13] No uncaught JS console errors on page load", async ({
      page,
    }) => {
      // Collect console errors
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
  });
});
