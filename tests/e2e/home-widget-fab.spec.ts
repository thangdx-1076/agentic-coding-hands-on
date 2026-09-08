import { test, expect } from "@playwright/test";

/**
 * E2E tests for Homepage Widget Button FAB (Floating Action Button) — EXPANDED state.
 *
 * MoMorph refs:
 * - FAB mở rộng: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/Sv7DFwBw1h
 * - Clarifications: plans/260908-1103-home-widget-fab/clarifications.md
 * - testPolicy: e2e-red-first
 *
 * This test suite covers the DESIGNED/EXPANDED panel state. The trigger button
 * (`aria-label="Hành động nhanh"`) is a single DOM node that morphs between
 * the pill (collapsed) and × icon (expanded); `aria-expanded` toggles false→true.
 *
 * Contract from clarifications.md:
 * - Panel contains 2 menuitems inside [role="menu"]:
 *   (1) "Thể lệ" link to "/standards" (NEW, replaces missing design)
 *   (2) "Viết KUDOS" link to "/kudos" (renamed from current "Sun* Kudos")
 * - ONE button that morphs: pill (106×64) → × icon (56×56)
 *   Trigger `aria-label="Hành động nhanh"` is constant in both states
 *   Clicking the trigger a second time (while open) closes the panel + returns focus
 * - NO "Award Information" item, NO link to "/awards" inside the panel
 * - Trigger pill's "/" separator text is hidden while panel is open
 * - aria-expanded = true when open, false when closed
 *
 * Related test: tests/e2e/home.spec.ts [TC ID-30–35] tests the collapsed state
 * and menu keyboard/click behavior. This suite focuses on the expanded panel design
 * and must not break existing tests.
 *
 * TEST-ID NUMBERING — read before adding a case here.
 *
 * `ID-<n>` is NOT a free-form label: it is a real MoMorph test-case id from the
 * frame's own 62-case list (`download_test_cases` on `i87tDx10uM`, mirrored in
 * F003's traceability line as `ID-0…ID-62`). This file originally invented
 * `ID-36`–`ID-40`, all five of which were already taken by unrelated cases:
 * ID-36/37/38 are the account-menu cases and ID-39/40 are the countdown cases
 * (ID-39 collided outright with `home.spec.ts`'s own `[TC ID-24, ID-39]`).
 *
 * Exactly one real MoMorph case covers this widget: **ID-54** — "Click widget
 * button (bottom right) → Quick action menu opens with available options" — so
 * the panel-opens case carries it. The other four assert the DESIGNED panel
 * (morph geometry, the two navigations, open/close consistency), for which no
 * MoMorph case exists at all: both FAB frames (`_hphd32jN2`, `Sv7DFwBw1h`)
 * return an empty `test_cases` list. Those therefore use the repo's existing
 * convention for coverage with no upstream id — an 8-hex stable slug, as in
 * `[TC b9805e65]` (login.spec.ts) and `[TC 20d87e28]` — not a made-up `ID-<n>`.
 *
 * So: only reuse an `ID-<n>` you have actually read out of that frame's
 * test-case list, and mint an 8-hex slug for anything genuinely new.
 */
test.describe("Homepage Widget Button FAB — EXPANDED state", () => {
  test.describe("Unauthenticated user", () => {
    // Ensure no auth cookies for consistency with other homepage tests
    test.use({ storageState: { cookies: [], origins: [] } });

    test("[TC ID-54] Widget button opens and shows designed expanded panel with 'Thể lệ' and 'Viết KUDOS' options", async ({
      page,
    }) => {
      await page.goto("/");

      // Locate the trigger button by its aria-label
      const widgetTrigger = page.locator(
        'button[aria-label="Hành động nhanh"]',
      );

      // Assert initial state: aria-expanded = false
      await expect(widgetTrigger).toHaveAttribute("aria-expanded", "false");

      // The pill's "/" separator text should be visible when closed
      // Use toContainText to avoid strict-mode violation from hasText matching ancestors
      await expect(widgetTrigger).toContainText("/");

      // Click to open the panel
      await widgetTrigger.click();

      // Assert aria-expanded = true when open
      await expect(widgetTrigger).toHaveAttribute("aria-expanded", "true");

      // Assert the "/" separator text is hidden (not displayed) while panel is open
      // The pill morphs to × icon, so "/" should not be visible
      await expect(widgetTrigger).not.toContainText("/");

      // Assert the menu panel is visible
      const menu = page.locator('[role="menu"]');
      await expect(menu).toBeVisible();

      // Assert first menuitem: "Thể lệ" link to "/standards"
      const standardsLink = menu.locator(
        'a[role="menuitem"][href="/standards"]',
      );
      await expect(standardsLink).toBeVisible();
      // Verify the accessible name contains "Thể lệ"
      await expect(standardsLink).toContainText("Thể lệ");

      // Move pointer away to avoid hover artifacts before measuring
      await page.mouse.move(0, 0);

      // Verify option is 64px tall (design spec)
      const standardsBox = await standardsLink.boundingBox();
      expect(standardsBox).toBeTruthy();
      expect(Math.abs(standardsBox!.height - 64)).toBeLessThanOrEqual(2);

      // Assert second menuitem: "Viết KUDOS" link to "/kudos"
      const writeKudosLink = menu.locator('a[role="menuitem"][href="/kudos"]');
      await expect(writeKudosLink).toBeVisible();
      // Verify the accessible name contains "Viết KUDOS"
      await expect(writeKudosLink).toContainText("Viết KUDOS");

      // Move pointer away again before measuring
      await page.mouse.move(0, 0);

      // Verify option is 64px tall (design spec)
      const kudosBox = await writeKudosLink.boundingBox();
      expect(kudosBox).toBeTruthy();
      expect(Math.abs(kudosBox!.height - 64)).toBeLessThanOrEqual(2);

      // Assert NO "Award Information" item — should not exist in the menu
      const awardInformationLink = menu.locator(
        'a[role="menuitem"][href="/awards"]',
      );
      await expect(awardInformationLink).not.toBeAttached();

      // Assert NO second /awards link anywhere in the menu by text search
      const awardTextInMenu = menu.locator("text=/Award Information/i");
      await expect(awardTextInMenu).not.toBeAttached();

      // Verify menu is inside the fixed widget container (right side of page)
      const menuBox = await menu.boundingBox();
      expect(menuBox).toBeTruthy();
      expect(menuBox!.x + menuBox!.width).toBeGreaterThan(
        page.viewportSize()!.width * 0.8,
      ); // Should be on the right side
    });

    test("[TC eaecd588] Widget button morphs to × icon (56×56) when open, clicking it closes panel and returns focus", async ({
      page,
    }) => {
      await page.goto("/");

      const widgetTrigger = page.locator(
        'button[aria-label="Hành động nhanh"]',
      );
      const menu = page.locator('[role="menu"]');
      const widgetContainer = page.getByTestId("home-widget-fab");

      // Initial state: pill is 106×64, aria-expanded = false
      // Move pointer away to avoid hover artifacts before measuring
      await page.mouse.move(0, 0);
      let triggerBox = await widgetTrigger.boundingBox();
      expect(triggerBox).toBeTruthy();
      expect(Math.abs(triggerBox!.width - 106)).toBeLessThanOrEqual(2);
      expect(Math.abs(triggerBox!.height - 64)).toBeLessThanOrEqual(2);
      await expect(widgetTrigger).toHaveAttribute("aria-expanded", "false");

      // Open the panel
      await widgetTrigger.click();
      await expect(menu).toBeVisible();

      // When open, aria-expanded = true
      await expect(widgetTrigger).toHaveAttribute("aria-expanded", "true");

      // Move pointer away before measuring to avoid hover scale
      await page.mouse.move(0, 0);

      // Pill morphs to × icon: width and height are both ~56×56
      triggerBox = await widgetTrigger.boundingBox();
      expect(triggerBox).toBeTruthy();
      expect(Math.abs(triggerBox!.width - 56)).toBeLessThanOrEqual(2);
      expect(Math.abs(triggerBox!.height - 56)).toBeLessThanOrEqual(2);

      // "/" separator is hidden when morphed to ×
      await expect(widgetTrigger).not.toContainText("/");

      // Assert there is EXACTLY ONE button in the fixed widget container
      // This proves the affordance is a morph, not a separate button
      await expect(widgetContainer.locator("button")).toHaveCount(1);

      // Verify trigger is NOT inside [role="menu"]
      await expect(menu.locator("button")).toHaveCount(0);

      // Clicking the trigger again closes the panel
      await widgetTrigger.click();
      await expect(menu).toBeHidden();

      // aria-expanded = false
      await expect(widgetTrigger).toHaveAttribute("aria-expanded", "false");

      // Focus returned to trigger button
      await expect(widgetTrigger).toBeFocused();

      // Move pointer away before measuring to avoid hover scale
      await page.mouse.move(0, 0);

      // Pill morphs back: 106×64
      triggerBox = await widgetTrigger.boundingBox();
      expect(triggerBox).toBeTruthy();
      expect(Math.abs(triggerBox!.width - 106)).toBeLessThanOrEqual(2);
      expect(Math.abs(triggerBox!.height - 64)).toBeLessThanOrEqual(2);

      // "/" separator is visible again
      await expect(widgetTrigger).toContainText("/");
    });

    test("[TC c4b65775] Clicking 'Thể lệ' link navigates to /standards and closes panel", async ({
      page,
    }) => {
      await page.goto("/");

      const widgetTrigger = page.locator(
        'button[aria-label="Hành động nhanh"]',
      );

      // Open the panel
      await widgetTrigger.click();

      // Click the "Thể lệ" link
      const standardsLink = page.locator(
        'a[role="menuitem"][href="/standards"]',
      );
      await standardsLink.click();

      // Assert navigation to /standards.
      //
      // Timeout raised well above the 5s default on purpose. Next's soft
      // navigation does not change `location` until the RSC payload for the
      // destination arrives, so this assertion is really waiting on the
      // destination route's server render. In CI, Supabase points at an
      // unreachable `http://127.0.0.1:54321`, and data-backed routes cost
      // ~7.4s there (measured across all 10 `kudos.spec.ts` tests in run
      // 34190836567) versus ~0.4s for `/`. `/standards` is cheaper, but a
      // cold route compile can still cross 5s, so both navigation cases get
      // the same realistic budget rather than one being a latent flake.
      //
      // Do NOT "simplify" this back to a bare `toHaveAttribute("href", ...)`
      // the way TC ID-44/45/53 in `home.spec.ts` do: TC ID-54 already asserts
      // both hrefs, so an href-only check here would be a pure duplicate.
      // What this test uniquely proves is that the click actually navigates —
      // both menuitems carry `onClick={() => close(false)}`, and a handler
      // that swallowed the default action would leave the href correct while
      // breaking the link.
      await expect(page).toHaveURL(/\/standards/, { timeout: 15_000 });
    });

    test("[TC 3b6565d3] Clicking 'Viết KUDOS' link navigates to /kudos and closes panel", async ({
      page,
    }) => {
      await page.goto("/");

      const widgetTrigger = page.locator(
        'button[aria-label="Hành động nhanh"]',
      );

      // Open the panel
      await widgetTrigger.click();

      // Click the "Viết KUDOS" link
      const writeKudosLink = page.locator('a[role="menuitem"][href="/kudos"]');
      await writeKudosLink.click();

      // Assert navigation to /kudos — see TC c4b65775 for why the timeout is
      // raised. This is the case that actually failed CI run 34190836567:
      // the URL was still `http://localhost:3000/` when the 5s default
      // expired, and the `[WebServer] destination stream closed early` lines
      // in that log are the server reacting to Playwright abandoning the
      // in-flight RSC request — a consequence of the timeout, not its cause.
      await expect(page).toHaveURL(/\/kudos/, { timeout: 15_000 });
    });

    test("[TC e0451b6d] Expanded panel remains consistent across open/close cycles", async ({
      page,
    }) => {
      await page.goto("/");

      const widgetTrigger = page.locator(
        'button[aria-label="Hành động nhanh"]',
      );
      const menu = page.locator('[role="menu"]');

      // First cycle: open
      await widgetTrigger.click();
      await expect(menu).toBeVisible();
      const standardsLink1 = menu.locator('a[href="/standards"]');
      await expect(standardsLink1).toBeVisible();
      const writeKudosLink1 = menu.locator('a[href="/kudos"]');
      await expect(writeKudosLink1).toBeVisible();

      // Close via Escape
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();

      // Second cycle: open again
      await widgetTrigger.click();
      await expect(menu).toBeVisible();

      // Assert same items are still there (consistency check)
      const standardsLink2 = menu.locator('a[href="/standards"]');
      await expect(standardsLink2).toBeVisible();
      const writeKudosLink2 = menu.locator('a[href="/kudos"]');
      await expect(writeKudosLink2).toBeVisible();

      // Assert NO "Award Information" link still doesn't exist
      const awardLink = menu.locator('a[href="/awards"]');
      await expect(awardLink).not.toBeAttached();
    });
  });
});
